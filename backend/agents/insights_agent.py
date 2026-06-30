"""
Insights Agent — on-demand analytics and coaching recap.

Triggered by: GET /insights

Aggregates task history into:
  - Completion rate (tasks done / tasks total in window)
  - Current streak (consecutive days with at least one task completed)
  - Category breakdown (completion rates per category)
  - Natural-language recap from Gemini

Tone (per spec section 6):
  ✅ Pattern-noticing and coaching:
     "Bills tend to slip for you — want me to schedule them two days earlier next time?"
  ❌ Scorecard of failures:
     "You missed 3 deadlines this month."

Model: gemini-3.5-flash via Vertex AI
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from services.firestore_client import get_db

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-3.5-flash"

INSIGHTS_INSTRUCTION = """You generate kind, coaching-style productivity recaps.

Given a user's task completion statistics, write 2–3 sentences that:
1. Acknowledge what went well (be specific about categories or streaks)
2. Notice one pattern where things tend to slip — frame as a gentle observation
3. Offer a concrete next-step suggestion

Never list failures or count missed deadlines as a score.
Use "I noticed" and "you tend to" rather than "you failed" or "you missed".
Keep it under 80 words."""


async def run_insights(uid: str, days: int = 30) -> dict:
    """
    Aggregate task history and generate a recap for the user.
    Phase 0 stub.
    """
    logger.info("Insights requested for uid=%s, days=%d", uid, days)

    # TODO Phase 3: implement full insights aggregation
    # 1. Query tasks in the window
    # 2. Compute stats
    # 3. Run Gemini to generate recap
    # 4. Store snapshot in insights_snapshots

    raise NotImplementedError("run_insights not yet implemented (Phase 3)")


def compute_streak(completed_dates: list[datetime]) -> int:
    """
    Compute the current consecutive-day streak of task completions.
    Deterministic — no LLM needed.
    """
    if not completed_dates:
        return 0

    today = datetime.now(timezone.utc).date()
    dates = sorted({d.date() for d in completed_dates}, reverse=True)

    streak = 0
    expected = today
    for d in dates:
        if d == expected:
            streak += 1
            expected = d - timedelta(days=1)
        elif d < expected:
            break

    return streak
