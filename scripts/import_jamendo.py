"""Bounded metadata import. No audio requests, scraping or ML processing."""

import argparse
import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from backend.config import DATA
from backend.provider import jamendo, trusted_url


async def run(limit=100):
    existing = {}
    path = DATA / "jamendo.json"
    if path.exists():
        existing = {
            t["id"]: t for t in json.loads(path.read_text(encoding="utf-8"))["tracks"]
        }

    def merge(t):
        license_url = t.get("license_ccurl", "")
        source = t.get("shareurl", "")
        if not license_url or not trusted_url(source, ("jamendo.com",)):
            return
        key = "jamendo:" + str(t["id"])
        existing[key] = {
            "id": key,
            "provider": "jamendo",
            "title": t["name"],
            "artist": t["artist_name"],
            "album": t.get("album_name", ""),
            "genres": t.get("musicinfo", {}).get("tags", {}).get("genres", [])[:8],
            "duration": t.get("duration", 0),
            "image_url": t.get("image", ""),
            "provider_url": source,
            "license_url": license_url,
            "feature_ready": False,
            "playback_available": bool(t.get("audio")),
        }

    old_ids = [key.split(":", 1)[1] for key in existing]
    for offset in range(0, len(old_ids), 30):
        batch = old_ids[offset : offset + 30]
        live = await jamendo(
            {"id": " ".join(batch), "limit": 30, "include": "musicinfo licenses"}
        )
        found = {str(t["id"]) for t in live}
        for id in batch:
            if id not in found:
                existing["jamendo:" + id]["playback_available"] = False
        for t in live:
            merge(t)
        await asyncio.sleep(0.3)
    genres = ("electronic", "rock", "pop", "jazz", "folk", "ambient")
    for offset in range(0, limit, 20):
        # Multi-valued parameters use spaces, not commas. Explicitly include singles.
        genre = genres[(offset // 20) % len(genres)]
        rows = await jamendo(
            {
                "limit": min(20, limit - offset),
                "offset": (offset // 120) * 20,
                "include": "musicinfo licenses",
                "featured": 1,
                "tags": genre,
                "groupby": "artist_id",
            }
        )
        for t in rows:
            merge(t)
        await asyncio.sleep(0.3)
    DATA.mkdir(exist_ok=True)
    artists = defaultdict(list)
    for t in existing.values():
        artists[t["artist"]].append(t)
    ordered = [
        bucket[i]
        for i in range(max((len(v) for v in artists.values()), default=0))
        for bucket in artists.values()
        if i < len(bucket)
    ]
    path.write_text(
        json.dumps(
            {
                "provider": "Jamendo",
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "attribution": "Music provided by Jamendo. Artist and source credits accompany every track.",
                "tracks": ordered,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Imported {len(existing)} licensed metadata records. No audio downloaded.")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--limit", type=int, default=100)
    args = p.parse_args()
    if not 1 <= args.limit <= 1000:
        p.error("Use 1–1000 metadata records.")
    asyncio.run(run(args.limit))
