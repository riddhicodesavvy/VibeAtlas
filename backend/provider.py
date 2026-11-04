"""Jamendo metadata access only; never fetches audio bytes."""

import asyncio
import httpx
from fastapi import HTTPException
from urllib.parse import urlparse
from .config import JAMENDO_CLIENT_ID


def trusted_url(value: str, hosts: tuple[str, ...]):
    try:
        u = urlparse(value)
        return (
            u.scheme == "https"
            and not u.username
            and not u.password
            and (
                u.hostname in hosts
                or any(u.hostname and u.hostname.endswith("." + h) for h in hosts)
            )
        )
    except ValueError:
        return False


async def jamendo(params: dict):
    if not JAMENDO_CLIENT_ID:
        raise HTTPException(503, "Jamendo is not configured on the backend.")
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
                response = await client.get(
                    "https://api.jamendo.com/v3.0/tracks/",
                    params={
                        "client_id": JAMENDO_CLIENT_ID,
                        "format": "json",
                        "type": "single albumtrack",
                        **params,
                    },
                )
            if response.status_code == 429 or response.status_code >= 500:
                if attempt < 2:
                    await asyncio.sleep(2**attempt)
                    continue
                raise HTTPException(
                    503, "The music provider is busy. Please retry later."
                )
            response.raise_for_status()
            body = response.json()
            if body.get("headers", {}).get("status") != "success":
                raise HTTPException(502, "The provider rejected the metadata request.")
            return body.get("results", [])
        except (httpx.HTTPError, ValueError):
            if attempt < 2:
                await asyncio.sleep(2**attempt)
                continue
            raise HTTPException(
                502,
                "The music provider is unavailable. Try again or open its original page.",
            ) from None
