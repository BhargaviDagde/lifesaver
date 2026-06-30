"""
Intake Agent — parses free text into a structured task.

Input:  Free text (typed, voice transcript, or email body)
Output: Structured task (title, deadline, estimatedMinutes, category)
        OR a clarification signal ("not enough information, ask the user X")

Rules:
  - Gmail-sourced tasks: write with status="inbox" (pending user approval)
  - Voice/manual tasks: proceed to Prioritizer without approval step
  - Never silently discard ambiguous input — surface clarification to the user

Implementation note:
  Before writing ADK code, read https://google.github.io/adk-docs/
  Use ADK structured output or propose_task(...) tool — check current docs
  for the recommended pattern.

Model: gemini-3.5-flash via Vertex AI (do NOT use gemini-2.5-flash)
"""

import logging
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-3.5-flash"

# Short, direct instruction (Gemini 3.x responds better to concise instructions)
INTAKE_INSTRUCTION = """You parse task descriptions into structured data.

Given free text, extract:
- title: short, action-oriented task name
- deadline: ISO 8601 timestamp if mentioned (infer date from context; today is provided)
- estimatedMinutes: integer estimate if mentioned or inferable
- category: one of "assignment" | "bill" | "interview" | "meeting" | "other"

If the deadline or title is unclear, do NOT guess. Instead, return a clarification
request explaining exactly what information is missing.

Return structured JSON only."""


class ParsedTask(BaseModel):
    """Structured output from the Intake Agent."""
    title: str
    deadline: Optional[datetime] = None
    estimatedMinutes: Optional[int] = None
    category: str = "other"
    needsClarification: bool = False
    clarificationQuestion: Optional[str] = None


def build_intake_agent():
    """
    Returns an ADK agent configured for task intake.
    Phase 0 stub.
    """
    # TODO Phase 2: implement with ADK
    # from google.adk.agents import LlmAgent  (verify import path in docs)
    raise NotImplementedError("IntakeAgent not yet implemented (Phase 2)")


async def run_intake(text: str, source: str = "manual", today_iso: str = "") -> ParsedTask:
    """
    Parse free text into a structured task.
    Phase 0 stub.
    """
    logger.info("Intake requested: source=%s, text=%r", source, text[:100])
    raise NotImplementedError("run_intake not yet implemented (Phase 2)")
