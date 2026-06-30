"""
Gmail tools — readonly inbox access for passive task intake.

Scans recent emails for deadline signals, surfaces them as suggested tasks
with status="inbox" pending user one-tap approval.
"""

import base64
import logging
import os
from datetime import datetime, timezone

from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from services.token_store import get_refresh_token

logger = logging.getLogger(__name__)

# Strong signals — one match is enough
STRONG_KEYWORDS = [
    "assignment due", "submit by", "submission deadline", "due by", "due date",
    "please complete by", "must be submitted", "turn in by", "due friday",
    "due monday", "due tuesday", "due wednesday", "due thursday", "due tomorrow",
    "due this week", "by end of", "exam on",
]

# Weak signals — only match if in subject line specifically
WEAK_SUBJECT_KEYWORDS = ["deadline", "due on", "is due"]


def _get_gmail_service(uid: str):
    refresh_token = get_refresh_token(uid)
    if not refresh_token:
        raise ValueError(f"Gmail not connected for user {uid}")
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


def scan_inbox_for_tasks(uid: str, max_results: int = 30) -> list[dict]:
    """
    Scan recent emails for deadline signals.
    Includes read and unread, last 7 days, excludes promotions/social.
    """
    service = _get_gmail_service(uid)

    # Broader query — include read emails, last 7 days, skip promo/social tabs
    query = "newer_than:7d -category:promotions -category:social"
    result = service.users().messages().list(
        userId="me", q=query, maxResults=max_results
    ).execute()

    messages = result.get("messages", [])
    candidate_emails = []

    for msg in messages:
        try:
            full_msg = service.users().messages().get(
                userId="me", id=msg["id"], format="metadata",
                metadataHeaders=["Subject", "From", "Date"],
            ).execute()

            headers = {h["name"]: h["value"]
                       for h in full_msg.get("payload", {}).get("headers", [])}
            subject = headers.get("Subject", "")
            snippet = full_msg.get("snippet", "")

            if _email_looks_like_task(subject, snippet):
                body_preview = _get_body_preview(service, msg["id"])
                candidate_emails.append({
                    "message_id": msg["id"],
                    "subject": subject,
                    "from": headers.get("From", ""),
                    "date": headers.get("Date", ""),
                    "snippet": snippet,
                    "body_preview": body_preview[:500],
                })
        except Exception as e:
            logger.warning("Failed to process message %s: %s", msg["id"], e)

    logger.info("Gmail scan uid=%s: %d candidates from %d emails",
                uid, len(candidate_emails), len(messages))
    return candidate_emails


def _email_looks_like_task(subject: str, snippet: str) -> bool:
    """
    Return True if the email likely contains a task/deadline.
    Strong keywords in subject+body are sufficient.
    Weak keywords only match if in the subject line.
    """
    full_text = (subject + " " + snippet).lower()
    subject_lower = subject.lower()

    # Strong keyword anywhere → match
    if any(kw in full_text for kw in STRONG_KEYWORDS):
        return True

    # Weak keyword only in subject → match
    if any(kw in subject_lower for kw in WEAK_SUBJECT_KEYWORDS):
        return True

    return False


def _get_body_preview(service, message_id: str) -> str:
    """Get first 500 chars of email plain text body."""
    try:
        msg = service.users().messages().get(
            userId="me", id=message_id, format="full"
        ).execute()

        def extract_text(part):
            if part.get("mimeType") == "text/plain":
                data = part.get("body", {}).get("data", "")
                if data:
                    return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
            for subpart in part.get("parts", []):
                result = extract_text(subpart)
                if result:
                    return result
            return ""

        text = extract_text(msg.get("payload", {}))
        return text[:500] if text else msg.get("snippet", "")
    except Exception:
        return ""
