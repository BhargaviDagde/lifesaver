"""
ADK Orchestrator — root LlmAgent wiring all sub-agents.

Two orchestration patterns (per spec section 3):

1. New-task path (SequentialAgent):
   Intake → Prioritizer → Scheduler
   Triggered by POST /tasks and POST /tasks/{id}/approve.

2. Conversational/voice path (LlmAgent with sub-agents as tools):
   Handles free-form requests — "what's due today", "push my essay to tomorrow".
   Triggered by voice WebSocket and conversational text input.

Phase 0: stubs — returns placeholder responses.
Phase 2: full ADK implementation (fetch ADK docs before implementing).

Docs: https://google.github.io/adk-docs/
Model: gemini-3.5-flash (do NOT use gemini-2.5-flash — retired)
"""

import os
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# NOTE: Implement Phase 2 by reading https://google.github.io/adk-docs/
# before writing any ADK code. The exact class names, constructor signatures,
# and session-state patterns are verified in live docs, not training data.
# ---------------------------------------------------------------------------

MODEL_NAME = "gemini-3.5-flash"  # Vertex AI, via ADC


def build_sequential_pipeline(user_context: dict):
    """
    Returns a SequentialAgent: Intake → Prioritizer → Scheduler.
    Phase 0 stub — raises NotImplementedError.
    """
    raise NotImplementedError("SequentialAgent pipeline not yet implemented (Phase 2)")


def build_conversational_agent(user_context: dict):
    """
    Returns the root LlmAgent with all sub-agents wired as tools.
    Phase 0 stub — raises NotImplementedError.
    """
    raise NotImplementedError("Conversational agent not yet implemented (Phase 2)")


async def run_new_task_pipeline(uid: str, text: str, source: str = "manual") -> dict:
    """
    Entry point for POST /tasks.
    Runs the sequential Intake → Prioritizer → Scheduler pipeline.
    Returns the created/updated task dict.
    """
    logger.info("New task pipeline requested for uid=%s, source=%s", uid, source)
    # TODO Phase 2
    raise NotImplementedError("run_new_task_pipeline not yet implemented (Phase 2)")
