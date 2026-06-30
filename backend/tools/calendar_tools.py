"""
Calendar tools — wrappers around Google Calendar API v3 for use as ADK agent tools.

Before implementing Phase 2, fetch current API docs:
  https://developers.google.com/calendar/api/v3/reference

Tool functions (to be registered as ADK tools on the Scheduler Agent):
  - list_busy_blocks(uid, start, end) → list of {start, end} busy periods
  - create_calendar_event(uid, title, start, end, description) → event_id
  - update_calendar_event(uid, event_id, start, end) → updated event
  - delete_calendar_event(uid, event_id) → None

All functions obtain fresh access tokens by refreshing from the stored
encrypted refresh token (services/token_store.py).
"""

import logging
import os
from datetime import datetime
from typing import Optional

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleAuthRequest
from googleapiclient.discovery import build

from services.token_store import get_refresh_token
from services.firestore_client import get_db

logger = logging.getLogger(__name__)


def _get_calendar_service(uid: str):
    """Build an authenticated Google Calendar API service for the given user."""
    refresh_token = get_refresh_token(uid)
    if not refresh_token:
        raise ValueError(f"No OAuth tokens found for user {uid}. Calendar not connected.")

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ["GOOGLE_OAUTH_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_OAUTH_CLIENT_SECRET"],
        scopes=["https://www.googleapis.com/auth/calendar"],
    )
    # Refresh to get a valid access token
    creds.refresh(GoogleAuthRequest())
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def list_busy_blocks(uid: str, start: datetime, end: datetime) -> list[dict]:
    """
    Returns busy time blocks for the user between start and end.
    Uses Calendar freebusy query.
    """
    service = _get_calendar_service(uid)
    body = {
        "timeMin": start.isoformat(),
        "timeMax": end.isoformat(),
        "items": [{"id": "primary"}],
    }
    result = service.freebusy().query(body=body).execute()
    busy = result.get("calendars", {}).get("primary", {}).get("busy", [])
    return busy  # list of {"start": "...", "end": "..."}


def create_calendar_event(
    uid: str,
    title: str,
    start: datetime,
    end: datetime,
    description: str = "",
    color_id: str = "2",  # sage green — calm, not alarming
) -> str:
    """
    Creates a Calendar event and returns the event ID.
    """
    service = _get_calendar_service(uid)
    event = {
        "summary": title,
        "description": description,
        "start": {"dateTime": start.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": end.isoformat(), "timeZone": "UTC"},
        "colorId": color_id,
        "source": {
            "title": "Last-Minute Life Saver",
            "url": os.environ.get("FRONTEND_URL", "https://lifesaver.app"),
        },
    }
    created = service.events().insert(calendarId="primary", body=event).execute()
    return created["id"]


def update_calendar_event(
    uid: str,
    event_id: str,
    start: datetime,
    end: datetime,
) -> dict:
    """Move an existing calendar event to a new time slot."""
    service = _get_calendar_service(uid)
    event = service.events().get(calendarId="primary", eventId=event_id).execute()
    event["start"] = {"dateTime": start.isoformat(), "timeZone": "UTC"}
    event["end"] = {"dateTime": end.isoformat(), "timeZone": "UTC"}
    updated = service.events().update(calendarId="primary", eventId=event_id, body=event).execute()
    return updated


def delete_calendar_event(uid: str, event_id: str) -> None:
    """Remove a calendar event."""
    service = _get_calendar_service(uid)
    service.events().delete(calendarId="primary", eventId=event_id).execute()
