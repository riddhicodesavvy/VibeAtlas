import json
import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend.main import app, requests
from backend.engine import engine
from backend.provider import trusted_url


@pytest.fixture
def client():
    requests.clear()
    return TestClient(app)


def selection():
    return {"track_ids": engine().ids[:3]}


def test_health_and_real_catalogue(client):
    h = client.get("/api/v1/health")
    assert h.status_code == 200
    assert h.json()["feature_count"] == 640
    r = client.get("/api/v1/tracks?provider=jamendo&limit=3")
    assert r.status_code == 200
    assert len(r.json()["items"]) == 3
    for t in r.json()["items"]:
        assert t["provider_url"].startswith("https://www.jamendo.com/")
        assert t["license_url"] and not t["feature_ready"]
        assert t["distance"] is None


def test_search_genres_pagination(client):
    first = client.get("/api/v1/tracks?provider=fma&limit=10").json()
    second = client.get("/api/v1/tracks?provider=fma&limit=10&offset=10").json()
    assert not set(t["id"] for t in first["items"]) & set(
        t["id"] for t in second["items"]
    )
    artist = first["items"][0]["artist"]
    r = client.get("/api/v1/tracks", params={"provider": "fma", "q": artist})
    assert r.status_code == 200 and r.json()["items"]
    r = client.get("/api/v1/tracks", params={"provider": "fma", "genre": "Rock"}).json()
    assert r["total"] == 80 and all("Rock" in t["genres"] for t in r["items"])
    assert client.get("/api/v1/tracks?limit=999999").status_code == 422


def test_valid_profile_and_independent_ranking(client):
    body = selection()
    p = client.post("/api/v1/profile", json=body)
    assert p.status_code == 200 and p.json()["selected_count"] == 3
    assert len(p.json()["features"]) == 5
    assert all(0 <= f["percentile"] <= 100 for f in p.json()["features"])
    assert abs(sum(p.json()["memberships"]) - 1) < 1e-10
    rec = client.post("/api/v1/recommendations", json={**body, "limit": 10}).json()
    e = engine()
    u = e.X[:3].mean(axis=0)
    expected = sorted(
        [
            (float(np.sqrt(np.sum((e.X[i] - u) ** 2))), id)
            for i, id in enumerate(e.ids)
            if id not in body["track_ids"]
        ],
        key=lambda v: (v[0], v[1]),
    )[:10]
    assert [r["id"] for r in rec] == [id for _, id in expected]
    assert np.allclose([r["distance"] for r in rec], [d for d, _ in expected])


@pytest.mark.parametrize(
    "body",
    [
        {"track_ids": []},
        {"track_ids": ["a", "b"]},
        {"track_ids": ["a", "a", "b"]},
        {"track_ids": ["jamendo:285", "jamendo:286", "jamendo:287"]},
        {"track_ids": ["missing"] * 31},
    ],
)
def test_invalid_selection(client, body):
    assert client.post("/api/v1/profile", json=body).status_code == 422


def test_stale_release_and_recommendation_filters(client):
    assert (
        client.post(
            "/api/v1/profile", json={**selection(), "release": "old-model"}
        ).status_code
        == 409
    )
    result = client.post(
        "/api/v1/recommendations", json={**selection(), "genre": "Rock", "limit": 5}
    )
    assert result.status_code == 200 and all(
        "Rock" in t["genres"] for t in result.json()
    )
    assert (
        client.post(
            "/api/v1/profile", json={**selection(), "vector": [1, 2, 3]}
        ).status_code
        == 422
    )


@pytest.mark.parametrize(
    "topic",
    [
        "models",
        "kmeans",
        "gmm",
        "em",
        "pca",
        "hierarchy",
        "factors",
        "dimensions",
        "distances",
        "evaluation",
    ],
)
def test_real_experiment_endpoints(client, topic):
    r = client.get("/api/v1/ml/" + topic)
    assert r.status_code == 200
    assert r.json()["release"] == engine().a["release"]
    json.dumps(r.json(), allow_nan=False)


def test_unavailable_playback_and_missing_track(client):
    assert client.get("/api/v1/tracks/fma:unknown").status_code == 404
    assert (
        client.get("/api/v1/tracks/" + engine().ids[0] + "/playback").status_code == 409
    )
    assert client.get("/api/v1/ml/not-real").status_code == 404


def test_cors_and_request_limits(client):
    allowed = client.options(
        "/api/v1/profile",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    denied = client.options(
        "/api/v1/profile",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert allowed.status_code == 200 and denied.status_code == 400
    assert client.post("/api/v1/profile", content="x" * 20000).status_code == 413


@pytest.mark.parametrize(
    "url",
    [
        "http://jamendo.com/stream",
        "https://jamendo.com.attacker.invalid/a",
        "https://jamendo.com@127.0.0.1/a",
        "file:///etc/passwd",
        "https://127.0.0.1/a",
    ],
)
def test_untrusted_streams_rejected(url):
    assert not trusted_url(url, ("jamendo.com",))


def test_verified_provider_host():
    assert trusted_url("https://prod-1.storage.jamendo.com/a", ("jamendo.com",))


def test_measured_feature_filter_and_invalid_ranges(client):
    e = engine()
    result = client.post(
        "/api/v1/recommendations",
        json={**selection(), "brightness_max": 1000, "limit": 10},
    )
    assert result.status_code == 200
    assert all(e.raw[e.index[t["id"]], 1] <= 1000 for t in result.json())
    assert (
        client.get(
            "/api/v1/tracks?provider=fma&brightness_min=3000&brightness_max=1000"
        ).status_code
        == 422
    )
    assert client.get("/api/v1/tracks?brightness_min=nan").status_code == 422
    assert (
        client.post(
            "/api/v1/recommendations",
            json={**selection(), "brightness_min": 3000, "brightness_max": 1000},
        ).status_code
        == 422
    )


def test_openapi_documents_typed_experiments(client):
    schema = client.get("/openapi.json").json()
    ref = schema["paths"]["/api/v1/ml/{experiment}"]["get"]["responses"]["200"][
        "content"
    ]["application/json"]["schema"]["$ref"]
    assert ref.endswith("/ExperimentResponse")
    assert (
        len(
            schema["components"]["schemas"]["ExperimentResponse"]["properties"][
                "result"
            ]["anyOf"]
        )
        == 9
    )


def test_dynamic_api_errors_are_not_cached(client):
    result = client.get("/api/v1/tracks/missing")
    assert result.status_code == 404 and result.headers["cache-control"] == "no-store"


def test_invalid_nonfinite_json_and_cors_on_size_errors(client):
    body = json.dumps(selection())[:-1] + ',"brightness_min":NaN}'
    invalid = client.post(
        "/api/v1/recommendations",
        content=body,
        headers={"Content-Type": "application/json"},
    )
    assert invalid.status_code == 422 and "NaN" not in invalid.text
    large = client.post(
        "/api/v1/profile",
        content="x" * 20000,
        headers={"Origin": "http://127.0.0.1:5173"},
    )
    assert (
        large.status_code == 413
        and large.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
    )


def test_recommendation_search_includes_candidates_beyond_first_page(client):
    all_tracks = engine().ids
    first = client.post(
        "/api/v1/recommendations", json={**selection(), "limit": 100}
    ).json()
    first_ids = {r["id"] for r in first} | set(selection()["track_ids"])
    from backend.engine import catalogue
    from collections import Counter

    names = Counter(t["title"] for t in catalogue().values() if t["provider"] == "fma")
    target = next(
        catalogue()[id]
        for id in all_tracks
        if id not in first_ids and names[catalogue()[id]["title"]] == 1
    )
    result = client.post(
        "/api/v1/recommendations",
        json={**selection(), "q": target["title"], "limit": 100},
    )
    assert result.status_code == 200 and target["id"] in {
        t["id"] for t in result.json()
    }


def test_optimized_asset_mime_and_spa_deep_link(client):
    response = client.get("/editorial-stage.webp")
    assert (
        response.status_code == 200 and response.headers["content-type"] == "image/webp"
    )
    assert response.content.startswith(b"RIFF")
    assert "text/html" in client.get("/my-vibe").headers["content-type"]
