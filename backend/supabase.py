"""Least-privilege runtime adapter. Public reads only; no service key loaded."""

import httpx
from fastapi import HTTPException
from .config import SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY


def configured():
    return bool(SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY)


async def read_songs(limit=100, offset=0):
    if not configured():
        raise HTTPException(503, "Supabase publishable credentials are not configured.")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                SUPABASE_URL.rstrip("/") + "/rest/v1/songs",
                headers={
                    "apikey": SUPABASE_PUBLISHABLE_KEY,
                    "Accept": "application/json",
                },
                params={
                    "select": "*",
                    "limit": min(limit, 100),
                    "offset": max(offset, 0),
                    "order": "id",
                },
            )
        if response.status_code != 200:
            raise HTTPException(
                503, "Supabase catalogue unavailable or read policy denied access."
            )
        return response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, "Supabase is unavailable.") from None
