"""
Monitor Agent — autonomous background sweep, the centrepiece demo feature.

Triggered by: POST /internal/monitor-sweep (cron-job.org, every ~20 min)
Runs WITHOUT any user interaction.

For each user with active tasks:
  1. Detect at-risk tasks (deadline < AT_RISK_HOURS away, or scheduled block passed)
  2. For each at-risk task:
     a. Use LLM to write a calm, specific push notification
     b. Attempt to find a new calendar slot and reschedule
     c. Update task status → "at_risk"
     d. Send FCM push
     e. Log to activity_log (visible in /activity feed)

Tone: calm competence, never alarm. "Moved to 2:15pm — slot found before your study group."
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from agents.model_config import get_model
from services.firestore_client import get_db
from tools.firestore_tools import list_tasks, update_task, log_agent_action, get_user_profile
from tools.fcm_tools import send_task_notification

logger = logging.getLogger(__name__)

AT_RISK_HOURS = 4        # flag as at-risk within this many hours of deadline
APP_NAME = "lifesaver"


# ---------------------------------------------------------------------------
# Main sweep entry point
# ---------------------------------------------------------------------------

async def run_monitor_sweep() -> dict:
    """
    Loop across all users, detect at-risk tasks, take autonomous action.
    Called from POST /internal/monitor-sweep.
    """
    now = datetime.now(timezone.utc)
    logger.info("Monitor sweep started at %s", now.isoformat())

    db = get_db()
    users_ref = db.collection("users")
    users = list(users_ref.stream())

    stats = {"users_scanned": 0, "tasks_flagged": 0, "notifications_sent": 0, "errors": 0}

    for user_doc in users:
        uid = user_doc.id
        try:
            flagged = await _sweep_user(uid, now)
            stats["users_scanned"] += 1
            stats["tasks_flagged"] += flagged["flagged"]
            stats["notifications_sent"] += flagged["notified"]
        except Exception as e:
            logger.error("Monitor sweep error for uid=%s: %s", uid, e, exc_info=True)
            stats["errors"] += 1

    logger.info("Monitor sweep complete: %s", stats)
    return stats


async def _sweep_user(uid: str, now: datetime) -> dict:
    """Sweep one user's tasks and act on at-risk ones."""
    active_statuses = {"inbox", "scheduled", "in_progress", "at_risk"}
    tasks = list_tasks(uid, status_filter=list(active_statuses))

    flagged = 0
    notified = 0

    for task in tasks:
        if not is_at_risk(task, now):
            continue

        task_id = task["id"]
        title = task.get("title", "Unknown task")
        deadline = _to_dt(task.get("deadline"))
        estimated_minutes = task.get("estimatedMinutes", 60)

        logger.info("At-risk task: uid=%s task=%s title=%r", uid, task_id, title)
        flagged += 1

        # 1. Generate notification copy via LLM
        notif = await _generate_notification(
            title=title,
            deadline=deadline,
            estimated_minutes=estimated_minutes,
            now=now,
        )

        # 2. Attempt reschedule
        reschedule_result = await _attempt_reschedule(
            uid=uid,
            task=task,
            now=now,
        )

        # 3. Update task status to at_risk
        update_task(uid, task_id, {
            "status": "at_risk",
            "scheduledStart": reschedule_result.get("newStart"),
            "scheduledEnd": reschedule_result.get("newEnd"),
            "calendarEventId": reschedule_result.get("eventId") or task.get("calendarEventId"),
        })

        # 4. Build final notification body
        if reschedule_result.get("rescheduled"):
            start = reschedule_result["newStart"]
            time_str = start.strftime("%-I:%M%p").lower() if hasattr(start, "strftime") else ""
            body = notif.get("body", f"'{title}' is at risk — rescheduled to {time_str}.")
        else:
            body = notif.get("body", f"'{title}' is due soon and needs attention.")

        # 5. Send FCM push
        fcm_result = send_task_notification(
            uid=uid,
            title="Life Saver",
            body=body,
            task_id=task_id,
        )
        if fcm_result["sent"] > 0:
            notified += 1

        # 6. Log to activity feed
        reasoning = reschedule_result.get("reasoning", "")
        action = f"Flagged '{title}' as at risk"
        if reschedule_result.get("rescheduled"):
            start = reschedule_result["newStart"]
            if hasattr(start, "strftime"):
                action = f"Rescheduled '{title}' to {start.strftime('%-I:%M%p').lower()}"
            else:
                action = f"Rescheduled '{title}' to a new slot"

        log_agent_action(
            uid=uid,
            agent="monitor",
            action=action,
            reasoning=reasoning or f"Deadline within {AT_RISK_HOURS} hours — took autonomous action.",
            task_id=task_id,
        )

    return {"flagged": flagged, "notified": notified}


# ---------------------------------------------------------------------------
# LLM: generate calm notification copy
# ---------------------------------------------------------------------------

async def _generate_notification(
    title: str,
    deadline: datetime | None,
    estimated_minutes: int,
    now: datetime,
) -> dict:
    """Use LLM to write a specific, calm push notification body."""

    hours_left = ""
    if deadline:
        h = (deadline - now).total_seconds() / 3600
        if h > 0:
            hours_left = f"{h:.1f} hours"

    agent = LlmAgent(
        name="MonitorNotifAgent",
        model=get_model(),
        description="Writes calm push notification copy for at-risk tasks.",
        output_key="notif_result",
        instruction=f"""Write a push notification for an at-risk task. Under 120 characters.

Task: "{title}"
Time until deadline: {hours_left or "soon"}
Estimated effort: {estimated_minutes} minutes

Rules:
- Calm, specific, reassuring — never alarming
- Mention the task name
- If rescheduling happened, mention the new time
- No words like URGENT, ALERT, WARNING, CRITICAL
- Active voice: "Moved to 2pm" not "Has been rescheduled"

Return ONLY a JSON object: {{"body": "<notification text>"}}""",
    )

    session_service = InMemorySessionService()
    session_id = str(uuid.uuid4())
    await session_service.create_session(app_name=APP_NAME, user_id="monitor", session_id=session_id)
    runner = Runner(agent=agent, app_name=APP_NAME, session_service=session_service)
    msg = genai_types.Content(role="user", parts=[genai_types.Part(text="Generate notification")])

    async for event in runner.run_async(user_id="monitor", session_id=session_id, new_message=msg):
        if event.is_final_response():
            break

    session = await session_service.get_session(app_name=APP_NAME, user_id="monitor", session_id=session_id)
    raw = session.state.get("notif_result", "{}")
    result = _parse_json(raw)
    return result if result.get("body") else {"body": f"'{title}' is due soon — check your schedule."}


# ---------------------------------------------------------------------------
# Reschedule: find new slot and move calendar event
# ---------------------------------------------------------------------------

async def _attempt_reschedule(uid: str, task: dict, now: datetime) -> dict:
    """
    Try to find a new calendar slot for the task and update the calendar event.
    Returns dict with rescheduled, newStart, newEnd, eventId, reasoning.
    """
    title = task.get("title", "Task")
    estimated_minutes = task.get("estimatedMinutes") or 60
    deadline = _to_dt(task.get("deadline"))
    existing_event_id = task.get("calendarEventId")

    # Only reschedule if there's time left before deadline
    if deadline and (deadline - now).total_seconds() < estimated_minutes * 60:
        return {
            "rescheduled": False,
            "reasoning": "Not enough time before deadline to reschedule.",
        }

    try:
        from tools.calendar_tools import list_busy_blocks, create_calendar_event, update_calendar_event
        from services.token_store import get_refresh_token

        if not get_refresh_token(uid):
            return {"rescheduled": False, "reasoning": "Calendar not connected."}

        # Search window: now → deadline (or next 4 hours if no deadline)
        search_end = deadline or (now + timedelta(hours=4))
        busy = list_busy_blocks(uid, now, search_end)

        # Find first free slot
        slot = _find_free_slot(
            now=now,
            end=search_end,
            duration_minutes=estimated_minutes,
            busy_blocks=busy,
            work_start=9,
            work_end=18,
        )

        if not slot:
            return {"rescheduled": False, "reasoning": "No free slot found before deadline."}

        slot_start, slot_end = slot

        # Move or create calendar event
        if existing_event_id:
            try:
                update_calendar_event(uid, existing_event_id, slot_start, slot_end)
                event_id = existing_event_id
            except Exception:
                event_id = create_calendar_event(uid, title, slot_start, slot_end,
                                                  "Rescheduled by Life Saver Monitor Agent")
        else:
            event_id = create_calendar_event(uid, title, slot_start, slot_end,
                                              "Scheduled by Life Saver Monitor Agent")

        time_str = slot_start.strftime("%-I:%M%p").lower()
        return {
            "rescheduled": True,
            "newStart": slot_start,
            "newEnd": slot_end,
            "eventId": event_id,
            "reasoning": f"Found free {estimated_minutes}-min slot at {time_str} before the deadline.",
        }

    except Exception as e:
        logger.warning("Reschedule failed for uid=%s: %s", uid, e)
        return {"rescheduled": False, "reasoning": f"Reschedule attempt failed: {e}"}


def _find_free_slot(
    now: datetime,
    end: datetime,
    duration_minutes: int,
    busy_blocks: list[dict],
    work_start: int = 9,
    work_end: int = 18,
) -> tuple[datetime, datetime] | None:
    """Find the earliest free slot of given duration within work hours."""
    duration = timedelta(minutes=duration_minutes)
    candidate = now + timedelta(minutes=30)  # at least 30 min from now

    # Snap to work hours start if before
    if candidate.hour < work_start:
        candidate = candidate.replace(hour=work_start, minute=0, second=0, microsecond=0)

    # Parse busy blocks
    parsed_busy = []
    for b in busy_blocks:
        try:
            bs = datetime.fromisoformat(b["start"].replace("Z", "+00:00"))
            be = datetime.fromisoformat(b["end"].replace("Z", "+00:00"))
            parsed_busy.append((bs, be))
        except Exception:
            pass
    parsed_busy.sort(key=lambda x: x[0])

    # Scan forward in 15-min steps
    while candidate + duration <= end:
        # Check within work hours
        if candidate.hour >= work_end:
            # Skip to next day work start
            candidate = (candidate + timedelta(days=1)).replace(
                hour=work_start, minute=0, second=0, microsecond=0
            )
            continue

        slot_end = candidate + duration
        # Cap at work end
        work_end_dt = candidate.replace(hour=work_end, minute=0, second=0, microsecond=0)
        if slot_end > work_end_dt:
            candidate = (candidate + timedelta(days=1)).replace(
                hour=work_start, minute=0, second=0, microsecond=0
            )
            continue

        # Check against busy blocks
        conflict = any(
            not (slot_end <= bs or candidate >= be)
            for bs, be in parsed_busy
        )

        if not conflict:
            return candidate, slot_end

        # Advance past the conflicting block
        for bs, be in parsed_busy:
            if bs <= candidate < be:
                candidate = be
                break
        else:
            candidate += timedelta(minutes=15)

    return None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def is_at_risk(task: dict, now: datetime) -> bool:
    """Deterministic at-risk check — no LLM needed."""
    status = task.get("status", "")
    if status in {"done", "dismissed", "missed"}:
        return False

    deadline = _to_dt(task.get("deadline"))
    if deadline:
        hours_remaining = (deadline - now).total_seconds() / 3600
        if 0 < hours_remaining <= AT_RISK_HOURS:
            return True

    # Scheduled block already passed without progress
    scheduled_end = _to_dt(task.get("scheduledEnd"))
    if scheduled_end and status not in {"in_progress", "done"}:
        if scheduled_end < now:
            return True

    return False


def _to_dt(val) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.replace(tzinfo=timezone.utc) if val.tzinfo is None else val
    try:
        # Firestore DatetimeWithNanoseconds
        if hasattr(val, 'tzinfo'):
            return val.replace(tzinfo=timezone.utc) if val.tzinfo is None else val
    except Exception:
        pass
    return None


def _parse_json(value) -> dict:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        clean = value.strip()
        if clean.startswith("```"):
            lines = clean.split("\n")
            clean = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            pass
    return {}
