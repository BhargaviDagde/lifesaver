"""GET /insights — triggers the Insights Agent on-demand."""

import logging
from fastapi import APIRouter, Request
from services.auth_middleware import verify_firebase_token

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/insights")
async def get_insights(request: Request, days: int = 30):
    """Run the Insights Agent and return the recap + stats."""
    uid = await verify_firebase_token(request)
    from agents.insights_agent import run_insights
    try:
        result = await run_insights(uid, days=days)
        return result
    except Exception as e:
        logger.error("Insights error for uid=%s: %s", uid, e, exc_info=True)
        return {
            "tasksCompleted": 0,
            "tasksMissed": 0,
            "onTimeRate": 0,
            "currentStreak": 0,
            "categoryBreakdown": {},
            "recap": "Add some tasks and complete them — your insights will appear here.",
            "error": str(e),
        }
