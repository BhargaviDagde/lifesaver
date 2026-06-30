"""
Internal routes — called by external cron service (cron-job.org), not by the frontend.

Security: X-Cron-Secret header checked against CRON_SECRET env var.
Set SKIP_SCHEDULER_AUTH=true in local dev to bypass.
"""

import logging
from fastapi import APIRouter, Request
from services.auth_middleware import verify_cron_secret

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internal")


@router.post("/monitor-sweep")
async def monitor_sweep(request: Request):
    """
    Cron target — triggered every ~20 min by cron-job.org.
    Phase 3: full Monitor Agent implementation.
    """
    await verify_cron_secret(request)
    logger.info("Monitor sweep triggered")
    # TODO Phase 3: Monitor Agent
    return {"status": "ok", "message": "Monitor sweep received. Full implementation in Phase 3."}


@router.post("/gmail-scan")
async def gmail_scan(request: Request):
    """
    Optional cron target — periodic Gmail inbox scan (Phase 4).
    """
    await verify_cron_secret(request)
    logger.info("Gmail scan triggered")
    # TODO Phase 4: Gmail scan
    return {"status": "ok", "message": "Gmail scan received. Full implementation in Phase 4."}
