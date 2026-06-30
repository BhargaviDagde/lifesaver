"""
Scheduler Agent — finds open calendar slots and books them.

Tools (see tools/calendar_tools.py):
  - list_busy_blocks(uid, start, end) — Calendar freebusy query
  - create_calendar_event(uid, title, start, end, description) — create event
  - update_calendar_event(uid, event_id, start, end) — move event
  - delete_calendar_event(uid, event_id) — remove event

Scheduling logic:
  1. Determine search window: from now until deadline
  2. Respect user's workHoursStart / workHoursEnd and timezone
  3. Work backward from deadline (closer deadlines get earlier slots)
  4. Find a contiguous free slot >= estimatedMinutes
  5. Create the calendar event, write back calendarEventId/scheduledStart/scheduledEnd
  6. Log the action with plain-English reasoning

Model: gemini-3.5-flash via Vertex AI
"""

import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-3.5-flash"

SCHEDULER_INSTRUCTION = """You schedule tasks by finding optimal calendar slots.

Given a task with a deadline and estimated duration:
1. Find the earliest available slot within work hours that fits the task
2. Prefer slots sooner rather than later for high-urgency tasks
3. Never schedule outside the user's stated work hours
4. Never schedule past the deadline

Use the provided calendar tools to check availability and create events.
After booking, explain in one sentence why you chose that slot."""


def build_scheduler_agent():
    """
    Returns an ADK agent with calendar tools attached.
    Phase 0 stub.
    """
    # TODO Phase 2: implement with ADK
    # Wire calendar_tools.py functions as ADK tools
    raise NotImplementedError("SchedulerAgent not yet implemented (Phase 2)")


async def run_scheduler(
    uid: str,
    task_id: str,
    title: str,
    deadline: datetime,
    estimated_minutes: int,
    work_hours_start: int = 9,
    work_hours_end: int = 18,
    timezone_str: str = "America/Chicago",
) -> dict:
    """
    Find a slot and create a calendar event for the task.
    Returns dict with calendarEventId, scheduledStart, scheduledEnd, reasoning.
    Phase 0 stub.
    """
    logger.info("Scheduler requested: uid=%s, task=%s, title=%r", uid, task_id, title)
    raise NotImplementedError("run_scheduler not yet implemented (Phase 2)")
