"""
Intake Agent — parses free text into a structured task.

Uses ADK LlmAgent with output_key="parsed_task" so the next agent in
the SequentialAgent pipeline can read it via {parsed_task} templating.

Model: gemini-3.5-flash (confirmed June 2026)
"""

import json
from datetime import datetime, timezone
from google.adk.agents import LlmAgent
from agents.model_config import get_model


def build_intake_agent() -> LlmAgent:
    """Return a configured Intake LlmAgent."""

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return LlmAgent(
        name="IntakeAgent",
        model=get_model(),
        description="Parses free-text task descriptions into structured JSON.",
        output_key="parsed_task",
        instruction=f"""You parse task descriptions into structured JSON. Today's date is {now_iso}.

Given free text, extract and return ONLY a valid JSON object with these fields:
- title: string — short, action-oriented task name (required)
- deadline: string — ISO 8601 date-time if a deadline is mentioned, otherwise null
- estimatedMinutes: integer — estimated effort in minutes if mentioned or inferable, otherwise null
- category: one of "assignment" | "bill" | "interview" | "meeting" | "other"
- needsClarification: boolean — true only if the title is completely unclear
- clarificationQuestion: string — if needsClarification is true, the specific question to ask

Rules:
- Infer relative dates from today ({now_iso}): "Friday" means the next Friday, "tomorrow" means the next day.
- For deadlines stated as just a day (e.g. "due Friday"), set time to 23:59:00 UTC.
- estimatedMinutes: "3 hours" → 180, "30 min" → 30, "about 2 hours" → 120.
- If no deadline is mentioned, set deadline to null.
- Return ONLY the JSON object, no other text, no markdown fences.""",
    )
