"""
Internal routes — endpoints called by Cloud Scheduler, not by the frontend.

Endpoints:
  POST /internal/monitor-sweep  — runs Monitor Agent across all users
  POST /internal/gmail-scan     — periodic Gmail inbox scan (Phase 4)

Security: both endpoints verify the Cloud Scheduler OIDC token.
Set SKIP_SCHEDULER_AUTH=true in local dev to bypass.
"""

import logging

from fastapi import APIRouter, Request

from services.auth_middleware import verify_cloud_scheduler_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internal")


@router.post("/monitor-sweep")
async def monitor_sweep(request: Request):
    """
    Cloud Scheduler target — runs every ~20 minutes.
    Monitor Agent scans all users for at-risk tasks and takes autonomous action.

    Phase 0: stub — validates auth and returns ok.
    Phase 3: full Monitor Agent implementation.
    """
    await verify_cloud_scheduler_token(request)

    logger.info("Monitor sweep triggered")

    # TODO Phase 3: instantiate Monitor Agent, loop across users, rescue at-risk tasks
    return {
        "status": "ok",
        "message": "Monitor sweep received. Full implementation in Phase 3.",
    }


@router.post("/gmail-scan")
async def gmail_scan(request: Request):
    """
    Optional Cloud Scheduler target — periodic Gmail inbox scan.
    Surfaces suggested tasks pending user approval.

    Phase 0: stub.
    Phase 4: full implementation.
    """
    await verify_cloud_scheduler_token(request)

    logger.info("Gmail scan triggered")

    # TODO Phase 4: scan Gmail for each connected user, create inbox-status tasks
    return {
        "status": "ok",
        "message": "Gmail scan received. Full implementation in Phase 4.",
    }
