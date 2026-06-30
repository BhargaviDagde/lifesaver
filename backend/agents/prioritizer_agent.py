"""
Prioritizer Agent — scores task urgency × importance × effort.

Reads {parsed_task} from session state (written by IntakeAgent via output_key).
Writes priorityScore + priorityReasoning to state via output_key="priority_result".

Scoring model (hybrid — explainable):
  urgency  = deterministic (hours until deadline, computed in instruction context)
  importance/effort = LLM-assessed (stakes, category, estimated effort)
  final = weighted combination

Model: gemini-3.5-flash
"""

from datetime import datetime, timezone
from google.adk.agents import LlmAgent
from agents.model_config import get_model


def build_prioritizer_agent() -> LlmAgent:
    now_iso = datetime.now(timezone.utc).isoformat()

    return LlmAgent(
        name="PrioritizerAgent",
        model=get_model(),
        description="Scores task urgency and importance, producing a 0-100 priority score.",
        output_key="priority_result",
        instruction=f"""You score task priority. Current UTC time: {now_iso}

The parsed task is: {{parsed_task}}

Compute and return ONLY a valid JSON object with:
- priorityScore: integer 0-100
- priorityReasoning: string — 1-2 sentences shown to the user explaining the score

Scoring guide:
1. Urgency (0-60 points, deterministic):
   - Deadline within 2 hours:  55-60 pts
   - Deadline within 4 hours:  45-54 pts
   - Deadline within 24 hours: 35-44 pts
   - Deadline within 3 days:   20-34 pts
   - Deadline within 7 days:   10-19 pts
   - No deadline or > 7 days:  0-9 pts

2. Importance/effort (0-40 points, you assess):
   - Category "interview": +35-40 pts (career impact)
   - Category "assignment" with high estimated effort (>2h): +25-35 pts
   - Category "bill": +20-30 pts (financial consequence)
   - Category "meeting": +15-25 pts
   - Category "other": +10-20 pts
   - Penalty: estimatedMinutes > 180 → subtract 5 pts (harder to fit last-minute)

Sum urgency + importance. Cap at 100.

reasoning should be specific: name the deadline time, category, and why it matters.
Example: "Due in 3 hours and it's a graded assignment — moved to top of queue."

Return ONLY the JSON object, no markdown.""",
    )
