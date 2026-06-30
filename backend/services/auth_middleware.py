"""
Auth middleware:
  - verify_firebase_token()       — validates Firebase ID tokens on user-facing endpoints
  - verify_cron_secret()          — validates the shared secret on /internal/* endpoints
                                    (replaces Cloud Scheduler OIDC, works with cron-job.org)
"""

import os
import logging
import secrets

from fastapi import HTTPException, Request
from firebase_admin import auth

logger = logging.getLogger(__name__)


async def verify_firebase_token(request: Request) -> str:
    """
    Extract and verify the Firebase ID token from the Authorization header.
    Returns the uid on success; raises HTTP 401 on failure.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header",
        )

    id_token = auth_header.removeprefix("Bearer ").strip()

    try:
        decoded = auth.verify_id_token(id_token)
        return decoded["uid"]
    except Exception as e:
        logger.warning("Firebase token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase token")


async def verify_cron_secret(request: Request) -> None:
    """
    Verify that an internal endpoint was called by the authorized cron service.

    Expects the header:  X-Cron-Secret: <CRON_SECRET env var>

    In local dev, set SKIP_SCHEDULER_AUTH=true to bypass entirely.
    This replaces Cloud Scheduler OIDC verification — compatible with
    cron-job.org, EasyCron, or any HTTP-based cron that supports custom headers.
    """
    if os.getenv("SKIP_SCHEDULER_AUTH", "").lower() == "true":
        logger.warning(
            "SKIP_SCHEDULER_AUTH is enabled — skipping cron auth (dev only)"
        )
        return

    expected_secret = os.environ.get("CRON_SECRET", "")
    if not expected_secret:
        logger.error("CRON_SECRET env var is not set — rejecting cron request")
        raise HTTPException(status_code=500, detail="Cron secret not configured")

    incoming_secret = request.headers.get("X-Cron-Secret", "")

    # Use constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(incoming_secret, expected_secret):
        logger.warning("Cron request rejected — invalid X-Cron-Secret header")
        raise HTTPException(status_code=403, detail="Invalid cron secret")
