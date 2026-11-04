import json
import logging
import mimetypes
import time
from contextlib import asynccontextmanager
from collections import defaultdict, deque
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from .config import CORS_ORIGINS, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY
from .engine import catalogue, engine
from .provider import jamendo, trusted_url
from .schemas import (
    Selection,
    RecommendationRequest,
    Track,
    TrackPage,
    Profile,
    Playback,
    Health,
)
from .schemas import (
    CatalogueStatus,
    GenreCount,
    Readiness,
    ExperimentResponse,
    ModelInformation,
)
from . import supabase

# Windows registry MIME associations must not turn script or image assets into downloads.
for extension, media_type in {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}.items():
    mimetypes.add_type(media_type, extension)


@asynccontextmanager
async def lifespan(application):
    application.state.remote_catalogue = None
    application.state.database_status = "not configured"
    if supabase.configured():
        try:
            remote = []
            for offset in range(0, 2000, 100):
                batch = await supabase.read_songs(100, offset)
                remote.extend(batch)
                if len(batch) < 100:
                    break
            research = {
                id: t for id, t in catalogue().items() if t["provider"] == "fma"
            }
            validated = {
                row["id"]: Track.model_validate(
                    {**row, "feature_ready": row["id"] in research}
                ).model_dump()
                for row in remote
            }
            application.state.remote_catalogue = {**research, **validated}
            application.state.database_status = "connected"
        except (HTTPException, ValueError, KeyError):
            application.state.database_status = (
                "unavailable; using real local metadata snapshot"
            )
    yield


app = FastAPI(
    title="VibeAtlas",
    version="1.0.0",
    description="Independent music discovery and reproducible Unit 3 experiments. No online training.",
    lifespan=lifespan,
)
requests: dict[str, deque] = defaultdict(deque)


@app.middleware("http")
async def limits(request: Request, call_next):
    try:
        length = int(request.headers.get("content-length", "0") or 0)
    except ValueError:
        return JSONResponse(
            status_code=400, content={"detail": "Invalid content length."}
        )
    if length < 0:
        return JSONResponse(
            status_code=400, content={"detail": "Invalid content length."}
        )
    if length > 16384:
        return JSONResponse(status_code=413, content={"detail": "Request too large."})
    if request.method == "POST":
        chunks = []
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > 16384:
                return JSONResponse(
                    status_code=413, content={"detail": "Request too large."}
                )
            chunks.append(chunk)
        request._body = b"".join(chunks)
    # Development/single-worker protection; production also requires platform throttling.
    key = request.client.host if request.client else "unknown"
    now = time.monotonic()
    queue = requests[key]
    while queue and queue[0] < now - 60:
        queue.popleft()
    if len(queue) >= 180:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Try again shortly."},
            headers={"Retry-After": "60"},
        )
    queue.append(now)
    if len(requests) > 10000:
        for k in list(requests):
            if not requests[k] or requests[k][-1] < now - 60:
                requests.pop(k, None)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)


@app.exception_handler(RequestValidationError)
async def invalid_request(request, exc):
    errors = [
        {"location": list(error["loc"]), "message": error["msg"], "type": error["type"]}
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "detail": {
                "message": "Check your request parameters and selections.",
                "errors": errors,
            }
        },
    )


@app.exception_handler(Exception)
async def unexpected(request, exc):
    logging.getLogger("vibeatlas").error("Unhandled API error: %s", type(exc).__name__)
    return JSONResponse(
        status_code=500, content={"detail": "Something went wrong. Please retry."}
    )


@app.get("/api/v1/health", response_model=Health)
def health():
    try:
        release = engine().a["release"]
    except HTTPException:
        release = None
    rows = list(active_catalogue().values())
    return {
        "status": "ok" if release else "degraded",
        "version": "1.0.0",
        "release": release,
        "catalogue_count": len(rows),
        "feature_count": sum(t["feature_ready"] for t in rows),
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY),
    }


@app.get("/api/v1/ready", response_model=Readiness)
def ready():
    return {"ready": True, "release": engine().a["release"]}


def active_catalogue():
    remote = getattr(app.state, "remote_catalogue", None)
    return remote if remote is not None else catalogue()


@app.get("/api/v1/catalogue/status", response_model=CatalogueStatus)
def catalogue_status():
    return {
        "source": "supabase"
        if getattr(app.state, "remote_catalogue", None) is not None
        else "real local metadata snapshot",
        "database": getattr(app.state, "database_status", "not configured"),
        "audio_analysis": "FMA published descriptors only; Jamendo analysis is not authorized",
    }


@app.get("/api/v1/genres", response_model=list[GenreCount])
def genres(provider: str = Query(default="fma", pattern="^(fma|jamendo|all)$")):
    counts = defaultdict(int)
    for t in active_catalogue().values():
        if provider == "all" or t["provider"] == provider:
            for g in t["genres"]:
                counts[g] += 1
    return [{"name": g, "count": n} for g, n in sorted(counts.items())]


@app.get("/api/v1/tracks", response_model=TrackPage)
def tracks(
    q: str = Query("", max_length=120),
    genre: str = Query("", max_length=80),
    provider: str = Query("jamendo", pattern="^(fma|jamendo|all)$"),
    feature_ready: bool = False,
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0, le=10000),
    brightness_min: float | None = Query(
        default=None, ge=0, le=24000, allow_inf_nan=False
    ),
    brightness_max: float | None = Query(
        default=None, ge=0, le=24000, allow_inf_nan=False
    ),
):
    if (
        brightness_min is not None
        and brightness_max is not None
        and brightness_min > brightness_max
    ):
        raise HTTPException(422, "Minimum brightness cannot exceed maximum brightness.")
    rows = [
        t
        for t in active_catalogue().values()
        if (provider == "all" or t["provider"] == provider)
        and (not feature_ready or t["feature_ready"])
        and (not genre or genre in t["genres"])
        and (not q or q.casefold() in (t["title"] + " " + t["artist"]).casefold())
    ]
    if brightness_min is not None or brightness_max is not None:
        e = engine()
        rows = [
            t
            for t in rows
            if t["id"] in e.index
            and (brightness_min is None or e.raw[e.index[t["id"]], 1] >= brightness_min)
            and (brightness_max is None or e.raw[e.index[t["id"]], 1] <= brightness_max)
        ]
    return {
        "items": rows[offset : offset + limit],
        "total": len(rows),
        "offset": offset,
        "limit": limit,
        "source": provider,
    }


@app.get("/api/v1/tracks/{track_id}", response_model=Track)
def track(track_id: str):
    if track_id not in active_catalogue():
        raise HTTPException(404, "Track not found.")
    return active_catalogue()[track_id]


@app.get("/api/v1/tracks/{track_id}/playback", response_model=Playback)
async def playback(track_id: str):
    t = track(track_id)
    if t["provider"] != "jamendo":
        raise HTTPException(
            409,
            "This FMA research record has no verified in-app playback. Open its source page.",
        )
    rows = await jamendo(
        {"id": track_id.removeprefix("jamendo:"), "limit": 1, "include": "licenses"}
    )
    if not rows or not trusted_url(rows[0].get("audio", ""), ("jamendo.com",)):
        raise HTTPException(
            410, "The provider no longer supplies an authorized stream for this track."
        )
    live = rows[0]
    return {
        "track_id": track_id,
        "url": live["audio"],
        "provider_url": t["provider_url"],
        "attribution": f"{live.get('name', t['title'])} — {live.get('artist_name', t['artist'])}. Music provided by Jamendo.",
        "license_url": live.get("license_ccurl", t["license_url"]),
    }


@app.post("/api/v1/profile", response_model=Profile)
def profile(selection: Selection):
    return engine().profile(selection)


@app.post("/api/v1/recommendations", response_model=list[Track])
def recommendations(selection: RecommendationRequest):
    return engine().recommend(selection)


@app.get("/api/v1/ml/models", response_model=ModelInformation)
def models():
    a = engine().a
    return {
        k: a[k]
        for k in (
            "release",
            "dataset",
            "dataset_hash",
            "feature_schema",
            "features",
            "chosen_k",
            "training",
            "provenance",
            "evaluation",
            "cluster_descriptions",
        )
    }


@app.get("/api/v1/ml/{experiment}", response_model=ExperimentResponse)
def experiment(experiment: str, k: int = Query(4, ge=2, le=10)):
    a = engine().a
    common = {
        "release": a["release"],
        "dataset": a["dataset"],
        "feature_schema": a["feature_schema"],
    }
    if experiment == "kmeans":
        if str(k) not in a["kmeans"]:
            raise HTTPException(422, "K is unavailable in this trained release.")
        result = {
            **a["kmeans"][str(k)],
            "ids": a["ids"],
            "coordinates": a["pca"]["coordinates"],
            "k": k,
        }
    elif experiment == "distances":
        result = {
            "ids": a["ids"],
            "vectors": a["scaled_features"],
            "metric": "Euclidean on standardized audio descriptors; cosine uses separately normalized vectors.",
        }
    elif experiment == "evaluation":
        result = a["evaluation"]
    elif experiment in ("gmm", "em", "pca", "hierarchy", "factors", "dimensions"):
        result = a[experiment]
    else:
        raise HTTPException(404, "Unknown experiment.")
    return {**common, "result": result}


# Optional single-process local production preview after `npm run build`.
from .config import ROOT
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

if (ROOT / "dist/assets").exists():
    app.mount(
        "/assets", StaticFiles(directory=ROOT / "dist/assets"), name="frontend-assets"
    )
if (ROOT / "public/notices").exists():
    app.mount(
        "/notices",
        StaticFiles(directory=ROOT / "public/notices"),
        name="third-party-notices",
    )


@app.get("/editorial-stage.png", include_in_schema=False)
def editorial_image():
    return FileResponse(ROOT / "public/editorial-stage.png", media_type="image/png")


@app.get("/editorial-stage.webp", include_in_schema=False)
def optimized_editorial_image():
    return FileResponse(ROOT / "public/editorial-stage.webp", media_type="image/webp")


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    if path.startswith("api/") or not (ROOT / "dist/index.html").exists():
        raise HTTPException(404, "Not found.")
    return FileResponse(ROOT / "dist/index.html")
