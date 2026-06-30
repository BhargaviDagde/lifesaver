"""
Insights Agent — on-demand analytics and coaching recap.

Triggered by GET /insights. Aggregates task history + generates Gemini recap.
Tone: pattern-noticing and coaching, never a failure scorecard.
"""

import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from collections import defaultdict

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from tools.firestore_tools import list_tasks, log_agent_action
from services.firestore_client import get_db
logger = logging.getLogger(__name__)
APP_NAME = "lifesaver"


async def run_insights(uid: str, days: int = 30) -> dict:
    """Aggregate task history and generate a coaching recap."""

    tasks = list_tasks(uid)
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=days)

    # Filter to window
    recent = [t for t in tasks if _task_in_window(t, window_start)]
    all_tasks = tasks  # for streak calc

    # --- Compute stats ---
    completed = [t for t in recent if t.get("status") == "done"]
    missed = [t for t in recent if t.get("status") == "missed"]
    total_with_deadline = [t for t in recent if t.get("deadline")]

    on_time = [
        t for t in completed
        if t.get("deadline") and _was_on_time(t)
    ]
    on_time_rate = round(len(on_time) / len(total_with_deadline) * 100) if total_with_deadline else 0

    # Category breakdown (completion rate per category)
    cat_done: dict = defaultdict(int)
    cat_total: dict = defaultdict(int)
    for t in recent:
        cat = t.get("category", "other")
        cat_total[cat] += 1
        if t.get("status") == "done":
            cat_done[cat] += 1
    category_breakdown = {
        cat: {"done": cat_done[cat], "total": cat_total[cat]}
        for cat in cat_total
    }

    # Streak
    completed_dates = [
        _to_dt(t.get("updatedAt"))
        for t in all_tasks
        if t.get("status") == "done" and t.get("updatedAt")
    ]
    streak = _compute_streak([d for d in completed_dates if d])

    stats = {
        "tasksCompleted": len(completed),
        "tasksMissed": len(missed),
        "totalWithDeadline": len(total_with_deadline),
        "onTimeRate": on_time_rate,
        "currentStreak": streak,
        "categoryBreakdown": category_breakdown,
        "windowDays": days,
    }

    # --- Generate Gemini recap ---
    recap = await _generate_recap(uid, stats)

    # Persist snapshot
    db = get_db()
    period = now.strftime("%Y-%m")
    db.collection("users").document(uid).collection("insights_snapshots").document(period).set({
        **stats,
        "recap": recap,
        "generatedAt": now,
    })

    log_agent_action(
        uid=uid,
        agent="insights",
        action=f"Generated {days}-day insights recap",
        reasoning=f"{len(completed)} tasks completed, {streak}-day streak, {on_time_rate}% on-time rate.",
    )

    return {**stats, "recap": recap, "generatedAt": now.isoformat()}


async def _generate_recap(uid: str, stats: dict) -> str:
    """Use LlmAgent to generate the coaching recap text."""

    stats_json = json.dumps(stats, default=str)

    agent = LlmAgent(
        name="InsightsAgent",
        model=get_model(),
        description="Generates a kind, coaching-style productivity recap.",
        instruction=f"""You write kind, coaching-style productivity recaps.

Stats for the past {stats['windowDays']} days:
{stats_json}

Write 2-3 sentences that:
1. Acknowledge what went well (be specific — mention streak or category if notable)
2. Notice one pattern where things tend to slip — gentle observation, not judgment
3. Offer a concrete next-step suggestion

Rules:
- Use "I noticed" and "you tend to" — never "you failed" or "you missed"
- Never list failures as a score
- Under 80 words
- Plain prose, no bullet points
- If streak > 3, lead with that — it's motivating""",
    )

    session_service = InMemorySessionService()
    session_id = str(uuid.uuid4())
    await session_service.create_session(app_name=APP_NAME, user_id=uid, session_id=session_id)

    runner = Runner(agent=agent, app_name=APP_NAME, session_service=session_service)
    message = genai_types.Content(role="user", parts=[genai_types.Part(text="Generate recap")])

    recap_text = ""
    async for event in runner.run_async(user_id=uid, session_id=session_id, new_message=message):
        if event.is_final_response() and event.content:
            for part in event.content.parts:
                if part.text:
                    recap_text = part.text.strip()
                    break

    return recap_text or "Keep going — you're building good habits."


def _task_in_window(task: dict, window_start: datetime) -> bool:
    created = _to_dt(task.get("createdAt"))
    return created is not None and created >= window_start


def _was_on_time(task: dict) -> bool:
    deadline = _to_dt(task.get("deadline"))
    updated = _to_dt(task.get("updatedAt"))
    if deadline and updated:
        return updated <= deadline
    return False


def _to_dt(val) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.replace(tzinfo=timezone.utc) if val.tzinfo is None else val
    try:
        # Firestore DatetimeWithNanoseconds
        return val.replace(tzinfo=timezone.utc) if val.tzinfo is None else val
    except Exception:
        return None


def _compute_streak(completed_dates: list[datetime]) -> int:
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
