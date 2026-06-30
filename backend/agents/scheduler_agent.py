"""
Scheduler Agent — finds an open calendar slot and returns it as JSON.

No ADK tools attached — Llama/Groq has issues with tool-call format via LiteLLM.
Instead: the agent reasons about scheduling given busy blocks passed in the prompt,
returns a JSON recommendation, and the orchestrator calls calendar APIs directly.
"""

from datetime import datetime, timezone
from google.adk.agents import LlmAgent
from agents.model_config import get_model


def build_scheduler_agent(
    work_start: int = 9,
    work_end: int = 18,
    busy_blocks_json: str = "[]",
    now_iso: str = "",
) -> LlmAgent:
    """
    Return a Scheduler LlmAgent that reasons about time slots.
    Busy blocks are passed in the instruction (pre-fetched by orchestrator).
    """
    if not now_iso:
        now_iso = datetime.now(timezone.utc).isoformat()

    return LlmAgent(
        name="SchedulerAgent",
        model=get_model(),
        description="Recommends the best calendar slot for a task.",
        output_key="schedule_result",
        instruction=f"""You recommend the best time slot to schedule a task. Current UTC time: {now_iso}

Task: {{parsed_task}}
Priority: {{priority_result}}

User's busy calendar blocks (UTC ISO format):
{busy_blocks_json}

Work hours: {work_start}:00–{work_end}:00 UTC.

Find the earliest contiguous FREE slot that:
1. Fits estimatedMinutes (default 60 if not specified)
2. Falls within work hours ({work_start}:00–{work_end}:00 UTC)
3. Does not overlap any busy block above
4. Is at least 30 minutes from now
5. Ends before the deadline (if there is one)

Return ONLY a valid JSON object:
{{
  "scheduledStart": "<ISO 8601 UTC>",
  "scheduledEnd": "<ISO 8601 UTC>",
  "reasoning": "<one sentence: why this slot>"
}}

If no slot exists before the deadline, return:
{{
  "scheduledStart": null,
  "scheduledEnd": null,
  "reasoning": "No available slot found before the deadline."
}}

Return ONLY the JSON object, no markdown fences.""",
    )
