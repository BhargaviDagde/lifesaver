"""
Gmail tools — readonly inbox access for passive task intake (Phase 4).

Scans for emails containing deadline signals and surfaces them as
suggested tasks with status="inbox" for user one-tap approval.

Before implementing Phase 4, fetch current Gmail API docs:
  https://developers.google.com/gmail/api/reference/rest
"""

import logging
import os
import base64
import re
from datetime import datetime, timezone
from typing import Optional

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleAuthRequest
from googleapiclient.discovery import build

from services.token_store import get_refresh_token

logger = logging.getLogger(__name__)

# Patterns that suggest a deadline is mentioned in an email
DEADLINE_KEYWORDS = [
    "due by", "due on", "due date", "deadline", "submit by", "submit before",
    "turn in", "assignment due", "exam on", "interview on", "please complete by",
]


def _get_gmail_service(uid: str):
    """Build an authenticated Gmail API service for the given user."""
    refresh_token = get_refresh_token(uid)
    if not refresh_token:
        raise ValueError(f"No OAuth tokens found for user {uid}. Gmail not connected.")

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ["GOOGLE_OAUTH_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_OAUTH_CLIENT_SECRET"],
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
    creds.refresh(GoogleAuthRequest())
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def scan_inbox_for_tasks(uid: str, max_results: int = 20) -> list[dict]:
    """
    Scan recent emails for potential tasks with deadlines.
    Returns a list of raw email snippets for the Intake Agent to process.

    Phase 4 implementation.
    """
    # TODO Phase 4: implement
    raise NotImplementedError("scan_inbox_for_tasks not yet implemented (Phase 4)")


def _get_email_body(service, message_id: str) -> str:
    """Extract plain text body from a Gmail message."""
    msg = service.users().messages().get(
        userId="me", id=message_id, format="full"
    ).execute()

    payload = msg.get("payload", {})
    parts = payload.get("parts", [])

    # Try to get plain text part first
    for part in parts:
        if part.get("mimeType") == "text/plain":
            data = part.get("body", {}).get("data", "")
            if data:
                return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

    # Fallback: use snippet
    return msg.get("snippet", "")


def _email_looks_like_task(subject: str, snippet: str) -> bool:
    """Quick heuristic check before sending to LLM."""
    text = (subject + " " + snippet).lower()
    return any(kw in text for kw in DEADLINE_KEYWORDS)
