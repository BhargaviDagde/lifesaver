"""
Prioritizer Agent — scores tasks and generates human-readable reasoning.

Scoring model (hybrid — explainable to judges, genuinely smart):
  1. Urgency component (deterministic):
     urgency = 1 - (hours_until_deadline / max_horizon_hours)
     Clipped to [0, 1]. A task due in 2 hours scores much higher than one due in a week.

  2. Importance/effort component (LLM-assessed):
     Gemini reasons about stakes and category:
     - A job interview outranks a routine bill at the same time-to-deadline
     - High estimated effort gets a slight penalty (harder to fit → lower urgency boost)
     Combined into a 0–1 importance score.

  3. Final weighted score:
     priorityScore = round((0.6 * urgency + 0.4 * importance) * 100)

  Output: priorityScore (0–100) + priorityReasoning (1–2 sentences, shown in UI)

Model: gemini-3.5-flash via Vertex AI
"""

import logging
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-3.5-flash"
MAX_HORIZON_HOURS = 168  # 7 days — tasks beyond this get minimum urgency score

PRIORITIZER_INSTRUCTION = """You assess task importance and effort for a productivity app.

Given a task title, category, estimated duration, and deadline context, return:
- importanceScore: float 0.0–1.0 reflecting stakes and category
  (job interview > assignment > bill > meeting > other at equal time pressure)
- effortPenalty: float 0.0–0.3 based on estimated minutes
  (tasks > 3 hours get a small penalty since they're harder to fit last-minute)
- reasoning: one to two sentences explaining the score in plain English

Be specific. "Important because it's a job interview with career implications" is good.
"This task is important" is not."""


class PriorityResult(BaseModel):
    priorityScore: int  # 0–100
    priorityReasoning: str
    importanceScore: float
    urgencyScore: float


def compute_urgency(deadline: Optional[datetime]) -> float:
    """Deterministic urgency: inverse of time remaining, clipped to [0, 1]."""
    if deadline is None:
        return 0.3  # no deadline → medium-low urgency
    now = datetime.now(timezone.utc)
    deadline_aware = deadline.replace(tzinfo=timezone.utc) if deadline.tzinfo is None else deadline
    hours_remaining = max(0, (deadline_aware - now).total_seconds() / 3600)
    urgency = 1.0 - min(hours_remaining / MAX_HORIZON_HOURS, 1.0)
    return round(urgency, 4)


def build_prioritizer_agent():
    """
    Returns an ADK agent configured for prioritization.
    Phase 0 stub.
    """
    # TODO Phase 2: implement with ADK
    raise NotImplementedError("PrioritizerAgent not yet implemented (Phase 2)")


async def run_prioritizer(
    title: str,
    category: str,
    deadline: Optional[datetime],
    estimated_minutes: Optional[int],
) -> PriorityResult:
    """
    Score a task and generate reasoning.
    Phase 0 stub — deterministic urgency only, no LLM call yet.
    """
    logger.info("Prioritizer requested: title=%r, category=%s", title, category)
    urgency = compute_urgency(deadline)
    # TODO Phase 2: LLM call for importance/effort component
    priority_score = round(urgency * 60)  # placeholder: 60% weight on urgency
    return PriorityResult(
        priorityScore=priority_score,
        priorityReasoning="Priority calculated from deadline urgency. Full LLM reasoning in Phase 2.",
        importanceScore=0.5,
        urgencyScore=urgency,
    )
