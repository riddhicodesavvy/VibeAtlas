import asyncio
import json
from unittest.mock import AsyncMock
import httpx
import numpy as np
import pytest
from fastapi import HTTPException
from backend import provider, supabase
from scripts.publication_rows import build_rows


def test_provider_transient_failure_retry(monkeypatch):
    responses = [
        httpx.Response(429, request=httpx.Request("GET", "https://api.jamendo.com/")),
        httpx.Response(
            200,
            json={"headers": {"status": "success"}, "results": [{"id": "verified"}]},
            request=httpx.Request("GET", "https://api.jamendo.com/"),
        ),
    ]
    mock = AsyncMock(side_effect=responses)
    monkeypatch.setattr(httpx.AsyncClient, "get", mock)
    monkeypatch.setattr(provider.asyncio, "sleep", AsyncMock())
    assert asyncio.run(provider.jamendo({"limit": 1})) == [{"id": "verified"}]
    assert mock.await_count == 2
    assert mock.call_args.kwargs["params"]["type"] == "single albumtrack"


def test_provider_failure_safe_error(monkeypatch):
    monkeypatch.setattr(
        httpx.AsyncClient,
        "get",
        AsyncMock(
            side_effect=httpx.ConnectError("A diagnostic that must not reach users.")
        ),
    )
    monkeypatch.setattr(provider.asyncio, "sleep", AsyncMock())
    with pytest.raises(HTTPException) as error:
        asyncio.run(provider.jamendo({"limit": 1}))
    assert error.value.status_code == 502 and "diagnostic" not in str(
        error.value.detail
    )


def test_missing_supabase_configuration_fails_closed(monkeypatch):
    monkeypatch.setattr(supabase, "SUPABASE_PUBLISHABLE_KEY", "")
    with pytest.raises(HTTPException) as error:
        asyncio.run(supabase.read_songs())
    assert error.value.status_code == 503


def test_supabase_read_adapter_contract(monkeypatch):
    monkeypatch.setattr(supabase, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(supabase, "SUPABASE_PUBLISHABLE_KEY", "test-only-placeholder")
    get = AsyncMock(return_value=httpx.Response(200, json=[{"id": "one"}]))
    monkeypatch.setattr(httpx.AsyncClient, "get", get)
    assert asyncio.run(supabase.read_songs(10000, -5)) == [{"id": "one"}]
    assert (
        get.call_args.kwargs["params"]["limit"] == 100
        and get.call_args.kwargs["params"]["offset"] == 0
    )


def test_publication_rows_have_real_relational_integrity():
    rows = build_rows()
    ids = {r["id"] for r in rows["songs"]}
    runs = {r["id"] for r in rows["model_runs"]}
    assert len(ids) == len(rows["songs"]) and len(rows["audio_features"]) == 640
    for table in (
        "source_attributions",
        "audio_features",
        "song_clusters",
        "song_embeddings",
    ):
        assert all(r["song_id"] in ids for r in rows[table])
    for table in ("song_clusters", "song_embeddings"):
        assert all(r["model_run_id"] in runs for r in rows[table])
    assert len(rows["song_clusters"]) == 6400 and len(rows["song_embeddings"]) == 640
    probabilities = [
        r["membership_probabilities"]
        for r in rows["song_clusters"]
        if r["membership_probabilities"] is not None
    ]
    assert all(abs(sum(p) - 1) < 1e-9 for p in probabilities)
    json.dumps(rows, allow_nan=False)
