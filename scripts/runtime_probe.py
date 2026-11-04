"""Verify the actual local API/build and record timings. Never fetch audio or log stream URLs."""

import json
import re
import time
from datetime import datetime, timezone
import httpx
import numpy as np
from backend.config import ROOT, JAMENDO_CLIENT_ID


def run():
    with httpx.Client(base_url="http://127.0.0.1:8000", timeout=40) as client:
        health = client.get("/api/v1/health")
        health.raise_for_status()
        h = health.json()
        assert h["status"] == "ok"
        catalogue = client.get("/api/v1/catalogue/status").json()
        routes = [
            "/",
            "/onboarding",
            "/my-vibe",
            "/discover",
            "/collections",
            "/universe",
            "/ml-lab",
            "/licenses",
            "/privacy",
        ]
        for route in routes:
            response = client.get(route)
            assert (
                response.status_code == 200
                and "text/html" in response.headers["content-type"]
            )
        index = client.get("/").text
        assets = re.findall(r'(?:src|href)="(/assets/[^"]+)"', index)
        assert assets and all(client.get(asset).status_code == 200 for asset in assets)
        image = client.get("/editorial-stage.webp")
        assert image.status_code == 200 and image.headers["content-type"].startswith(
            "image/webp"
        )
        notices = client.get("/notices/THIRD_PARTY_NOTICES.txt")
        assert notices.status_code == 200 and "@fontsource/dm-sans" in notices.text
        fma = client.get(
            "/api/v1/tracks", params={"provider": "fma", "limit": 3}
        ).json()["items"]
        selection = {"track_ids": [t["id"] for t in fma]}
        profile = client.post("/api/v1/profile", json=selection)
        profile.raise_for_status()
        p = profile.json()
        recommendations = client.post(
            "/api/v1/recommendations",
            json={**selection, "release": p["release"], "limit": 6},
        )
        recommendations.raise_for_status()
        recs = recommendations.json()
        assert len(recs) == 6 and all(
            r["id"] not in selection["track_ids"] and r["distance"] >= 0 for r in recs
        )
        topics = [
            "kmeans",
            "gmm",
            "em",
            "pca",
            "dimensions",
            "factors",
            "hierarchy",
            "distances",
            "evaluation",
        ]
        for topic in topics:
            response = client.get("/api/v1/ml/" + topic)
            assert (
                response.status_code == 200
                and response.json()["release"] == h["release"]
            )
        listening = client.get(
            "/api/v1/tracks", params={"provider": "jamendo", "limit": 1}
        ).json()["items"]
        stream_available = False
        credential_exposed = False
        if listening:
            response = client.get("/api/v1/tracks/" + listening[0]["id"] + "/playback")
            if response.status_code == 200:
                stream = response.json()["url"]
                stream_available = stream.startswith("https://")
                credential_exposed = bool(
                    JAMENDO_CLIENT_ID and JAMENDO_CLIENT_ID in stream
                )
        timings = {}
        for name in ("catalogue", "profile"):
            samples = []
            for _ in range(12):
                before = time.perf_counter()
                response = (
                    client.get("/api/v1/tracks?provider=jamendo&limit=24")
                    if name == "catalogue"
                    else client.post("/api/v1/profile", json=selection)
                )
                response.raise_for_status()
                samples.append((time.perf_counter() - before) * 1000)
            timings[name] = {
                "samples": len(samples) - 1,
                "warm_p50_ms": round(float(np.percentile(samples[1:], 50)), 2),
                "warm_p95_ms": round(float(np.percentile(samples[1:], 95)), 2),
            }
        forbidden = {}
        for path in (
            "/api.docx",
            "/API.DOCX?raw",
            "/.env.local",
            "/@fs/" + str(ROOT / "api.docx").replace("\\", "/"),
        ):
            result = client.head("http://127.0.0.1:5173" + path)
            forbidden[path.split("/")[-1]] = result.status_code
            assert result.status_code == 403
    report = {
        "verified_at_utc": datetime.now(timezone.utc).isoformat(),
        "health": h,
        "catalogue_status": catalogue,
        "spa_shell_routes_http_200": routes,
        "built_entry_assets_http_200": len(assets),
        "hero_bytes": len(image.content),
        "third_party_notices_retrieved": True,
        "real_profile_generated": True,
        "real_recommendations_returned": len(recs),
        "ml_endpoints_http_200": topics,
        "provider_stream_reference_available": stream_available,
        "stream_reference_contains_configured_client_id": credential_exposed,
        "audio_fetched": False,
        "dev_private_file_status": forbidden,
        "local_warm_http_timings": timings,
        "limits": "HTTP checks do not prove browser layout, audible playback, accessibility or a cloud deployment. Timings are local warm measurements, not Core Web Vitals.",
    }
    (ROOT / "docs/runtime-verification.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    run()
