"""
Auth middleware — verifies Firebase ID tokens on inbound requests.

Usage in route handlers:
    uid = await verify_firebase_token(request)

For internal endpoints (Monitor sweep), use verify_cloud_scheduler_token()
to validate the OIDC token attached by Cloud Scheduler.
"""

import os
import logging
from typing import Optional

import httpx
from fastapi import HTTPException, Request
from firebase_admin import auth

logger = logging.getLogger(__name__)

# Expected audience for Cloud Scheduler OIDC tokens
_SCHEDULER_SERVICE_ACCOUNT = os.getenv("CLOUD_SCHEDULER_SERVICE_ACCOUNT", "")
_BACKEND_URL = os.getenv("BACKEND_URL", "")


async def verify_firebase_token(request: Request) -> str:
    """
    Extract and verify the Firebase ID token from the Authorization header.
    Returns the uid on success; raises HTTP 401 on failure.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    id_token = auth_header.removeprefix("Bearer ").strip()

    try:
        decoded = auth.verify_id_token(id_token)
        return decoded["uid"]
    except Exception as e:
        logger.warning("Firebase token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase token")


async def verify_cloud_scheduler_token(request: Request) -> None:
    """
    Verify that an internal endpoint was called by Cloud Scheduler.
    Cloud Scheduler attaches an OIDC token as a Bearer token;
    we verify it against Google's token info endpoint.

    In local dev, set SKIP_SCHEDULER_AUTH=true to bypass this check.
    """
    if os.getenv("SKIP_SCHEDULER_AUTH", "").lower() == "true":
        logger.warning("SKIP_SCHEDULER_AUTH is enabled — skipping OIDC verification (dev only)")
        return

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=403, detail="Missing OIDC token from Cloud Scheduler")

    oidc_token = auth_header.removeprefix("Bearer ").strip()

    # Verify token using Google's tokeninfo endpoint
    # In production, use google-auth library for proper verification
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": oidc_token},
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=403, detail="Invalid OIDC token")

        claims = resp.json()
        expected_audience = f"{_BACKEND_URL}/internal/monitor-sweep"
        if claims.get("aud") not in [expected_audience, _BACKEND_URL]:
            logger.warning("OIDC token audience mismatch: %s", claims.get("aud"))
            raise HTTPException(status_code=403, detail="OIDC token audience mismatch")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("OIDC verification error: %s", e)
        raise HTTPException(status_code=403, detail="OIDC verification failed")
