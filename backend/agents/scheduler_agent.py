"""
Scheduler Agent — finds an open calendar slot and books it.

Reads {parsed_task} and {priority_result} from session state.
Calls calendar tools to find availability and create an event.
Writes scheduling result to state via output_key="schedule_result".

Model: gemini-3.5-flash
"""

from datetime import datetime, timezone
from google.adk.agents import LlmAgent
from tools.calendar_tools import list_busy_blocks, create_calendar_event

MODEL = "gemini-3.5-flash"


def build_scheduler_agent(uid: str, work_start: int = 9, work_end: int = 18,
                           tz_str: str = "America/Chicago") -> LlmAgent:
    """
    Return a configured Scheduler LlmAgent with calendar tools bound to the user.

    We use closures to bind uid to each tool function so the agent
    doesn't need to know about uid — it just calls the tools.
    """

    now_iso = datetime.now(timezone.utc).isoformat()

    def check_availability(start_iso: str, end_iso: str) -> dict:
        """Check busy blocks on the user's Google Calendar between two ISO timestamps.

        Args:
            start_iso: Start of search window in ISO 8601 format (UTC).
            end_iso: End of search window in ISO 8601 format (UTC).

        Returns:
            dict with 'busy' list of {start, end} blocks, or 'error' string.
        """
        try:
            from datetime import datetime as dt
            start = dt.fromisoformat(start_iso.replace("Z", "+00:00"))
            end = dt.fromisoformat(end_iso.replace("Z", "+00:00"))
            busy = list_busy_blocks(uid, start, end)
            return {"busy": busy}
        except Exception as e:
            return {"error": str(e)}

    def book_calendar_event(title: str, start_iso: str, end_iso: str,
                            description: str = "") -> dict:
        """Create a calendar event on the user's Google Calendar.

        Args:
            title: Event title.
            start_iso: Start time in ISO 8601 format (UTC).
            end_iso: End time in ISO 8601 format (UTC).
            description: Optional event description.

        Returns:
            dict with 'eventId' string, or 'error' string.
        """
        try:
            from datetime import datetime as dt
            start = dt.fromisoformat(start_iso.replace("Z", "+00:00"))
            end = dt.fromisoformat(end_iso.replace("Z", "+00:00"))
            event_id = create_calendar_event(uid, title, start, end, description)
            return {"eventId": event_id, "start": start_iso, "end": end_iso}
        except Exception as e:
            return {"error": str(e)}

    return LlmAgent(
        name="SchedulerAgent",
        model=MODEL,
        description="Finds an open calendar slot and books it for the task.",
        tools=[check_availability, book_calendar_event],
        output_key="schedule_result",
        instruction=f"""You schedule a task onto the user's calendar. Current UTC time: {now_iso}

Task: {{parsed_task}}
Priority: {{priority_result}}

Work hours: {work_start}:00–{work_end}:00 local time (treat as UTC for now).

Instructions:
1. If the task already has a deadline, search from now until the deadline.
   If no deadline, search the next 7 days.
2. Call check_availability to find busy blocks in the search window.
3. Find the earliest contiguous free slot that:
   - Fits estimatedMinutes (default 60 min if not specified)
   - Falls within work hours ({work_start}:00–{work_end}:00)
   - Is at least 30 minutes from now
   - Ends before the deadline (if there is one)
4. Call book_calendar_event with the task title, chosen start/end times.
5. Return ONLY a JSON object with:
   - eventId: string (from booking, or null if calendar not connected)
   - scheduledStart: ISO 8601 string
   - scheduledEnd: ISO 8601 string
   - reasoning: 1 sentence — why you chose that slot
   - calendarConnected: boolean

If check_availability returns an error (calendar not connected), return:
{{"eventId": null, "scheduledStart": null, "scheduledEnd": null,
  "reasoning": "Calendar not connected — task saved without a scheduled block.",
  "calendarConnected": false}}

Return ONLY the JSON object, no markdown.""",
    )
