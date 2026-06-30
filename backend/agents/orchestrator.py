"""
ADK Orchestrator — runs the Intake → Prioritizer → Scheduler pipeline.

Uses SequentialAgent so each step shares the same InvocationContext/session state.
Each LlmAgent writes its result via output_key; the next reads it via {key} templating.

Flow:
  User text
    → IntakeAgent        (output_key="parsed_task")
    → PrioritizerAgent   (reads {parsed_task}, output_key="priority_result")
    → SchedulerAgent     (reads {parsed_task} + {priority_result}, output_key="schedule_result")

After the pipeline, we read all three keys from the final session state and
return them to the caller for Firestore persistence.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

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
    Run the full Intake → Prioritizer → Scheduler pipeline for a new task.

    Returns a dict with all fields needed to write the task to Firestore:
    {
        title, deadline, estimatedMinutes, category,
        priorityScore, priorityReasoning,
        calendarEventId, scheduledStart, scheduledEnd,
        schedulingReasoning, needsClarification, clarificationQuestion
    }
    """

    # Build agents fresh per call so work hours / uid are captured in closures
    intake = build_intake_agent()
    prioritizer = build_prioritizer_agent()
    scheduler = build_scheduler_agent(uid, work_start, work_end, timezone_str)

    pipeline = SequentialAgent(
        name="TaskPipeline",
        sub_agents=[intake, prioritizer, scheduler],
        description="Parses, prioritizes, and schedules a new task.",
    )

    # Each invocation gets its own in-memory session
    session_service = InMemorySessionService()
    session_id = str(uuid.uuid4())

    await session_service.create_session(
        app_name=APP_NAME,
        user_id=uid,
        session_id=session_id,
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

    # Collect all events; we only need the final session state
    async for event in runner.run_async(
        user_id=uid,
        session_id=session_id,
        new_message=user_message,
    ):
        if event.is_final_response():
            logger.debug("Pipeline final event: %s", event)

    # Read the state written by each agent
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=uid, session_id=session_id
    )
    state = session.state

    parsed_task = _parse_json_state(state.get("parsed_task", "{}"))
    priority_result = _parse_json_state(state.get("priority_result", "{}"))
    schedule_result = _parse_json_state(state.get("schedule_result", "{}"))

    logger.info(
        "Pipeline complete for uid=%s: parsed=%s, score=%s, scheduled=%s",
        uid,
        parsed_task.get("title"),
        priority_result.get("priorityScore"),
        schedule_result.get("scheduledStart"),
    )

    # Parse deadline string → datetime if present
    deadline_dt = None
    deadline_str = parsed_task.get("deadline")
    if deadline_str:
        try:
            deadline_dt = datetime.fromisoformat(
                deadline_str.replace("Z", "+00:00")
            )
        except ValueError:
            logger.warning("Could not parse deadline: %s", deadline_str)

    # Parse scheduledStart/End → datetime if present
    def _parse_dt(s):
        if not s:
            return None
        try:
            return datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None

    return {
        "title": parsed_task.get("title", text[:100]),
        "deadline": deadline_dt,
        "estimatedMinutes": parsed_task.get("estimatedMinutes"),
        "category": parsed_task.get("category", "other"),
        "needsClarification": parsed_task.get("needsClarification", False),
        "clarificationQuestion": parsed_task.get("clarificationQuestion"),
        "priorityScore": priority_result.get("priorityScore"),
        "priorityReasoning": priority_result.get("priorityReasoning"),
        "calendarEventId": schedule_result.get("eventId"),
        "scheduledStart": _parse_dt(schedule_result.get("scheduledStart")),
        "scheduledEnd": _parse_dt(schedule_result.get("scheduledEnd")),
        "schedulingReasoning": schedule_result.get("reasoning"),
        "calendarConnected": schedule_result.get("calendarConnected", False),
    }


def _parse_json_state(value) -> dict:
    """Parse a state value that might be a JSON string or already a dict."""
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        # Strip markdown fences if present
        clean = value.strip()
        if clean.startswith("```"):
            lines = clean.split("\n")
            clean = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            logger.warning("Could not parse state JSON: %s", value[:200])
    return {}
