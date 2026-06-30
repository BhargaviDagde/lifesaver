"""
ADK Orchestrator — runs the Intake → Prioritizer → Scheduler pipeline.

Pipeline flow:
  1. IntakeAgent       — parses text → {parsed_task}
  2. PrioritizerAgent  — scores task → {priority_result}
  3. SchedulerAgent    — recommends slot → {schedule_result}
     (busy blocks pre-fetched in Python; no ADK tools on scheduler to avoid
      Groq/Llama tool-call format issues)
  4. Orchestrator creates the calendar event directly via Python after pipeline.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta

from google.adk.agents.sequential_agent import SequentialAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from agents.intake_agent import build_intake_agent
from agents.prioritizer_agent import build_prioritizer_agent
from agents.scheduler_agent import build_scheduler_agent

logger = logging.getLogger(__name__)
APP_NAME = "lifesaver"


async def run_new_task_pipeline(
    uid: str,
    text: str,
    source: str = "manual",
    work_start: int = 9,
    work_end: int = 18,
    timezone_str: str = "America/Chicago",
) -> dict:
    """
    Run Intake → Prioritizer → Scheduler pipeline and return task fields
    ready to write to Firestore.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # Pre-fetch busy blocks (only if calendar connected)
    busy_blocks_json = await _fetch_busy_blocks(uid, now)

    # Build agents
    intake = build_intake_agent()
    prioritizer = build_prioritizer_agent()
    scheduler = build_scheduler_agent(
        work_start=work_start,
        work_end=work_end,
        busy_blocks_json=busy_blocks_json,
        now_iso=now_iso,
    )

    pipeline = SequentialAgent(
        name="TaskPipeline",
        sub_agents=[intake, prioritizer, scheduler],
        description="Parses, prioritizes, and schedules a new task.",
    )

    session_service = InMemorySessionService()
    session_id = str(uuid.uuid4())
    await session_service.create_session(
        app_name=APP_NAME, user_id=uid, session_id=session_id
    )

    runner = Runner(
        agent=pipeline,
        app_name=APP_NAME,
        session_service=session_service,
    )

    user_message = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=text)],
    )

    async for event in runner.run_async(
        user_id=uid, session_id=session_id, new_message=user_message
    ):
        if event.is_final_response():
            logger.debug("Pipeline final response received")

    session = await session_service.get_session(
        app_name=APP_NAME, user_id=uid, session_id=session_id
    )
    state = session.state

    parsed_task = _parse_json(state.get("parsed_task", "{}"))
    priority_result = _parse_json(state.get("priority_result", "{}"))
    schedule_result = _parse_json(state.get("schedule_result", "{}"))

    logger.info(
        "Pipeline done: uid=%s title=%r score=%s slot=%s",
        uid,
        parsed_task.get("title"),
        priority_result.get("priorityScore"),
        schedule_result.get("scheduledStart"),
    )

    # Parse deadline
    deadline_dt = _parse_dt(parsed_task.get("deadline"))

    # Create calendar event if slot was found and calendar is connected
    scheduled_start = _parse_dt(schedule_result.get("scheduledStart"))
    scheduled_end = _parse_dt(schedule_result.get("scheduledEnd"))
    calendar_event_id = None

    if scheduled_start and scheduled_end:
        calendar_event_id = await _create_calendar_event(
            uid=uid,
            title=parsed_task.get("title", text[:80]),
            start=scheduled_start,
            end=scheduled_end,
        )

    return {
        "title": parsed_task.get("title", text[:100]),
        "deadline": deadline_dt,
        "estimatedMinutes": parsed_task.get("estimatedMinutes"),
        "category": parsed_task.get("category", "other"),
        "needsClarification": parsed_task.get("needsClarification", False),
        "clarificationQuestion": parsed_task.get("clarificationQuestion"),
        "priorityScore": priority_result.get("priorityScore"),
        "priorityReasoning": priority_result.get("priorityReasoning"),
        "calendarEventId": calendar_event_id,
        "scheduledStart": scheduled_start,
        "scheduledEnd": scheduled_end,
        "schedulingReasoning": schedule_result.get("reasoning"),
        "calendarConnected": busy_blocks_json != "[]",
    }


async def _fetch_busy_blocks(uid: str, now: datetime) -> str:
    """Fetch calendar busy blocks for next 7 days. Returns JSON string."""
    try:
        from tools.calendar_tools import list_busy_blocks
        from services.token_store import get_refresh_token
        if not get_refresh_token(uid):
            return "[]"
        end = now + timedelta(days=7)
        busy = list_busy_blocks(uid, now, end)
        return json.dumps(busy)
    except Exception as e:
        logger.info("Calendar not connected for uid=%s: %s", uid, e)
        return "[]"


async def _create_calendar_event(
    uid: str, title: str, start: datetime, end: datetime
) -> str | None:
    """Create a calendar event. Returns event ID or None."""
    try:
        from tools.calendar_tools import create_calendar_event
        from services.token_store import get_refresh_token
        if not get_refresh_token(uid):
            return None
        return create_calendar_event(uid, title, start, end)
    except Exception as e:
        logger.warning("Calendar event creation failed: %s", e)
        return None


def _parse_json(value) -> dict:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        clean = value.strip()
        # Strip markdown fences if present
        if clean.startswith("```"):
            lines = clean.split("\n")
            clean = "\n".join(
                lines[1:-1] if lines and lines[-1].strip() == "```" else lines[1:]
            )
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            logger.warning("Could not parse state JSON: %s", value[:200])
    return {}


def _parse_dt(val) -> datetime | None:
    if not val:
        return None
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except ValueError:
        return None
