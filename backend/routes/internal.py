"""
Internal routes — called by external cron service (cron-job.org), not by the frontend.

Security: X-Cron-Secret header checked against CRON_SECRET env var.
Set SKIP_SCHEDULER_AUTH=true in local dev to bypass.
"""

import logging
from fastapi import APIRouter, Request, BackgroundTasks
from services.auth_middleware import verify_cron_secret

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internal")


@router.post("/monitor-sweep")
async def monitor_sweep(request: Request, background_tasks: BackgroundTasks):
    """
    Cron target — triggered every ~20 min by cron-job.org.
    Runs the Monitor Agent sweep across all users.
    Returns immediately; sweep runs in background so cron doesn't time out.
    """
    await verify_cron_secret(request)
    logger.info("Monitor sweep triggered")

    from agents.monitor_agent import run_monitor_sweep

    # Run in background so the HTTP response returns fast
    background_tasks.add_task(_run_sweep)
    return {"status": "ok", "message": "Monitor sweep started."}


async def _run_sweep():
    """Background task wrapper with error catching."""
    try:
        from agents.monitor_agent import run_monitor_sweep
        result = await run_monitor_sweep()
        logger.info("Monitor sweep finished: %s", result)
    except Exception as e:
        logger.error("Monitor sweep failed: %s", e, exc_info=True)


@router.post("/gmail-scan")
async def gmail_scan(request: Request):
    """Optional cron target — periodic Gmail inbox scan (Phase 4)."""
    await verify_cron_secret(request)
    logger.info("Gmail scan triggered")
    return {"status": "ok", "message": "Gmail scan received. Phase 4 implementation pending."}
