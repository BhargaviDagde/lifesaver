"""
Calendar route — returns this week's events for the frontend calendar view.
"""

import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request
from services.auth_middleware import verify_firebase_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calendar")


@router.get("/events")
async def get_calendar_events(request: Request, days: int = 7):
    """
    Fetch calendar events for the next `days` days.
    Returns both Google Calendar events and Life Saver task blocks.
    """
    uid = await verify_firebase_token(request)

    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days)

    events = []

    # 1. Fetch from Google Calendar if connected
    try:
        from services.token_store import get_refresh_token
        from tools.calendar_tools import _get_calendar_service

        refresh_token = get_refresh_token(uid)
        if refresh_token:
            service = _get_calendar_service(uid)
            result = service.events().list(
                calendarId="primary",
                timeMin=now.isoformat(),
                timeMax=end.isoformat(),
                singleEvents=True,
                orderBy="startTime",
                maxResults=50,
            ).execute()

            for item in result.get("items", []):
                start = item.get("start", {})
                end_ev = item.get("end", {})
                events.append({
                    "id": item.get("id"),
                    "title": item.get("summary", "Busy"),
                    "start": start.get("dateTime") or start.get("date"),
                    "end": end_ev.get("dateTime") or end_ev.get("date"),
                    "type": "calendar",
                    "color": "#6B7A8D",
                })
    except Exception as e:
        logger.info("Could not fetch Google Calendar events: %s", e)

    # 2. Fetch Life Saver task blocks from Firestore
    try:
        from services.firestore_client import get_db
        db = get_db()
        tasks = db.collection("users").document(uid).collection("tasks")\
            .where("scheduledStart", ">=", now)\
            .where("scheduledStart", "<=", end)\
            .stream()

        for task in tasks:
            data = task.to_dict()
            if data.get("scheduledStart") and data.get("status") not in {"done", "dismissed"}:
                start_dt = data["scheduledStart"]
                end_dt = data.get("scheduledEnd", start_dt)
                # Convert Firestore Timestamps to ISO strings
                start_iso = start_dt.isoformat() if hasattr(start_dt, 'isoformat') else str(start_dt)
                end_iso = end_dt.isoformat() if hasattr(end_dt, 'isoformat') else str(end_dt)

                status = data.get("status", "scheduled")
                color = "#F6AE2D" if status == "at_risk" else "#38B2AC"

                events.append({
                    "id": task.id,
                    "title": data.get("title", "Task"),
                    "start": start_iso,
                    "end": end_iso,
                    "type": "task",
                    "status": status,
                    "color": color,
                    "category": data.get("category", "other"),
                    "priorityScore": data.get("priorityScore"),
                })
    except Exception as e:
        logger.warning("Could not fetch task blocks: %s", e)

    # Sort by start time
    events.sort(key=lambda e: e.get("start") or "")

    return {"events": events, "from": now.isoformat(), "to": end.isoformat()}
