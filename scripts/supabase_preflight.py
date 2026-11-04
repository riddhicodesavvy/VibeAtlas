"""Read-only API inspection. RLS needs SQL/MCP inspection, not an empty API result."""

import asyncio
import json
import httpx
from backend.config import SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY


async def run():
    if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:
        print(
            json.dumps(
                {
                    "configured": False,
                    "status": "blocked",
                    "reason": "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required. MCP OAuth does not populate application environment keys.",
                    "rls": "unverified",
                }
            )
        )
        return
    async with httpx.AsyncClient(timeout=15) as client:
        for table in (
            "songs",
            "audio_features",
            "model_runs",
            "song_clusters",
            "song_embeddings",
            "source_attributions",
        ):
            try:
                r = await client.get(
                    SUPABASE_URL.rstrip("/") + "/rest/v1/" + table,
                    headers={"apikey": SUPABASE_PUBLISHABLE_KEY},
                    params={"select": "*", "limit": 0},
                )
                print(
                    json.dumps(
                        {
                            "table": table,
                            "http": r.status_code,
                            "read_endpoint_reachable": r.status_code == 200,
                            "rls": "unverified: inspect catalogue policies through SQL/MCP",
                        }
                    )
                )
            except httpx.HTTPError:
                print(json.dumps({"table": table, "connection": "unavailable"}))


if __name__ == "__main__":
    asyncio.run(run())
