"""Explicit, bounded publication after recorded schema review; no DDL or deletion."""

import argparse
import json
import os
from pathlib import Path
import httpx
from backend.config import DATA, SUPABASE_URL
from scripts.publication_rows import build_rows


def publish(review_path):
    review = json.loads(review_path.read_text())
    if not all(
        review.get(k) is True
        for k in (
            "schema_inspected",
            "backup_verified",
            "compatibility_verified",
            "rls_verified",
        )
    ):
        raise SystemExit("Schema review gates are incomplete; nothing written.")
    if review.get("project_url") != SUPABASE_URL:
        raise SystemExit(
            "Review project does not match configured project; nothing written."
        )
    key = os.getenv("SUPABASE_SECRET_KEY", "")
    if not key or not SUPABASE_URL:
        raise SystemExit("Trusted publication credentials missing; nothing written.")
    tables = build_rows()
    conflicts = {
        "songs": "provider,provider_track_id",
        "source_attributions": "song_id",
        "audio_features": "song_id,feature_schema_version,extraction_version",
        "model_runs": "id",
        "song_clusters": "song_id,model_run_id",
        "song_embeddings": "song_id,model_run_id",
    }
    with httpx.Client(timeout=20) as client:
        # Verify retained IDs before any insert so ignore-duplicates cannot break foreign keys.
        identities = {
            (r["provider"], r["provider_track_id"]): r["id"] for r in tables["songs"]
        }
        for offset in range(0, 100000, 100):
            check = client.get(
                SUPABASE_URL.rstrip("/") + "/rest/v1/songs",
                headers={"apikey": key},
                params={
                    "select": "id,provider,provider_track_id",
                    "limit": 100,
                    "offset": offset,
                    "order": "id",
                },
            )
            if check.status_code != 200:
                raise SystemExit("Identity inspection failed; nothing written.")
            batch = check.json()
            for old in batch:
                expected = identities.get((old["provider"], old["provider_track_id"]))
                if expected and old["id"] != expected:
                    raise SystemExit(
                        "Existing track IDs differ from prepared rows. Write an additive mapping before publication; nothing written."
                    )
            if len(batch) < 100:
                break
        else:
            raise SystemExit(
                "Identity inspection exceeded its safe bound; nothing written."
            )
        for table, rows in tables.items():
            for offset in range(0, len(rows), 50):
                response = client.post(
                    SUPABASE_URL.rstrip("/") + "/rest/v1/" + table,
                    headers={
                        "apikey": key,
                        "Content-Type": "application/json",
                        "Prefer": "resolution=ignore-duplicates,return=minimal",
                    },
                    params={"on_conflict": conflicts[table]},
                    json=rows[offset : offset + 50],
                )
                if response.status_code not in (200, 201, 204):
                    raise SystemExit(
                        f"Publication stopped in {table}, batch {offset // 50 + 1}: HTTP {response.status_code}. No response body logged. Prior inserts are retained; retry is idempotent."
                    )
            print(
                f"{table}: published at most {len(rows)} records without updating or deleting existing rows."
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--review", type=Path, required=True)
    args = parser.parse_args()
    publish(args.review)
