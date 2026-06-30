"""
Monitor Agent — autonomous background agent triggered by Cloud Scheduler.

This is the centerpiece "autonomous execution" feature.
It runs every ~20 minutes WITHOUT any user interaction.

Triggered by: POST /internal/monitor-sweep (Cloud Scheduler, OIDC-verified)

At-risk conditions:
  1. Deadline within AT_RISK_HOURS (default: 4) and status not in {done, dismissed}
  2. Scheduled block already passed without task in-progress or done

Actions per at-risk task:
  1. Send FCM push notification — specific, calm, reasoned copy (see copywriting guide below)
  2. Autonomously re-block a new calendar slot where sensible
  3. Update task status to "at_risk"
  4. Log the action + reasoning in activity_log

Tone for push notifications (per spec section 9):
  ✅ "Your lab report is due in 3 hours — moved your 2pm block earlier, you're all set"
  ✅ "Chemistry essay needs 2 hours, but Friday's filling up — grabbed Thursday 4–6pm"
  ❌ "URGENT: Task deadline approaching!"
  ❌ "Reminder: Complete task"

Model: gemini-3.5-flash via Vertex AI
"""

import logging
from datetime import datetime, timezone, timedelta

from services.firestore_client import get_db

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-3.5-flash"
AT_RISK_HOURS = 4  # hours before deadline to flag as at-risk

MONITOR_INSTRUCTION = """You are a calm, proactive assistant that rescues at-risk tasks.

For each at-risk task, you:
1. Assess whether a calendar reschedule is possible and helpful
2. If yes, find a new slot and move the event — explain why you chose it
3. Write a short, calm push notification (under 120 characters) that states:
   - What task is at risk
   - What action you took (if any)
   - A reassuring close

Never use urgency words like URGENT, ALERT, CRITICAL.
Be specific about times: "moved to 2:15pm" not "rescheduled"."""


async def run_monitor_sweep() -> dict:
    """
    Main entry point called from POST /internal/monitor-sweep.
    Loops across all users, flags at-risk tasks, takes autonomous action.
    Phase 0 stub.
    """
    logger.info("Monitor sweep started at %s", datetime.now(timezone.utc).isoformat())

    # TODO Phase 3: implement full sweep
    # 1. Query Firestore for all users with connected calendars
    # 2. For each user, query tasks where status not in {done, dismissed, missed}
    # 3. Apply at-risk conditions
    # 4. For each at-risk task:
    #    a. Send FCM push (tools/fcm_tools.py)
    #    b. Attempt calendar reschedule (tools/calendar_tools.py)
    #    c. Update task status and log activity

    raise NotImplementedError("run_monitor_sweep not yet implemented (Phase 3)")


def is_at_risk(task: dict, now: datetime) -> bool:
    """
    Determine if a task is at risk given current time.
    Deterministic — no LLM needed here.
    """
    status = task.get("status", "")
    if status in {"done", "dismissed", "missed"}:
        return False

    deadline = task.get("deadline")
    if deadline:
        deadline_dt = deadline if isinstance(deadline, datetime) else deadline.replace(tzinfo=timezone.utc)
        if deadline_dt.tzinfo is None:
            deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
        hours_remaining = (deadline_dt - now).total_seconds() / 3600
        if 0 < hours_remaining <= AT_RISK_HOURS:
            return True

    # Scheduled block already passed without progress
    scheduled_end = task.get("scheduledEnd")
    if scheduled_end and status not in {"in_progress", "done"}:
        scheduled_end_dt = scheduled_end if isinstance(scheduled_end, datetime) else scheduled_end
        if isinstance(scheduled_end_dt, datetime):
            if scheduled_end_dt.tzinfo is None:
                scheduled_end_dt = scheduled_end_dt.replace(tzinfo=timezone.utc)
            if scheduled_end_dt < now:
                return True

    return False
