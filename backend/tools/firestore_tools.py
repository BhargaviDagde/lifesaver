"""
Firestore tools — typed helpers for reading/writing tasks and activity logs.
Used by agent code instead of raw Firestore calls.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
import uuid

from services.firestore_client import get_db

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Task helpers
# ---------------------------------------------------------------------------


def get_task(uid: str, task_id: str) -> Optional[dict]:
    db = get_db()
    doc = db.collection("users").document(uid).collection("tasks").document(task_id).get()
    if not doc.exists:
        return None
    return {"id": doc.id, **doc.to_dict()}


def list_tasks(uid: str, status_filter: Optional[list[str]] = None) -> list[dict]:
    db = get_db()
    query = db.collection("users").document(uid).collection("tasks")
    if status_filter:
        # Firestore doesn't support `in` on multiple fields directly;
        # filter client-side for small task lists
        docs = query.stream()
        return [
            {"id": d.id, **d.to_dict()}
            for d in docs
            if d.to_dict().get("status") in status_filter
        ]
    return [{"id": d.id, **d.to_dict()} for d in query.stream()]


def create_task(uid: str, task_data: dict) -> str:
    """Create a task document and return its ID."""
    db = get_db()
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc_ref = db.collection("users").document(uid).collection("tasks").document(task_id)
    doc_ref.set(
        {
            **task_data,
            "createdAt": now,
            "updatedAt": now,
        }
    )
    return task_id


def update_task(uid: str, task_id: str, updates: dict) -> None:
    db = get_db()
    updates["updatedAt"] = datetime.now(timezone.utc)
    db.collection("users").document(uid).collection("tasks").document(task_id).update(updates)


def delete_task(uid: str, task_id: str) -> None:
    db = get_db()
    db.collection("users").document(uid).collection("tasks").document(task_id).delete()


# ---------------------------------------------------------------------------
# Activity log helpers
# ---------------------------------------------------------------------------


def log_agent_action(
    uid: str,
    agent: str,
    action: str,
    reasoning: str = "",
    task_id: Optional[str] = None,
) -> str:
    """
    Write an entry to the user's activity log.
    agent: "intake" | "prioritizer" | "scheduler" | "monitor" | "insights"
    action: human-readable, e.g. "Moved 'Lab report' to 2:15–3:00pm Thursday"
    """
    db = get_db()
    log_id = str(uuid.uuid4())
    entry = {
        "agent": agent,
        "action": action,
        "reasoning": reasoning,
        "createdAt": datetime.now(timezone.utc),
    }
    if task_id:
        entry["taskId"] = task_id

    db.collection("users").document(uid).collection("activity_log").document(log_id).set(entry)
    return log_id


def get_activity_log(uid: str, limit: int = 50) -> list[dict]:
    """Fetch the most recent activity log entries for a user."""
    db = get_db()
    docs = (
        db.collection("users")
        .document(uid)
        .collection("activity_log")
        .order_by("createdAt", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]


# ---------------------------------------------------------------------------
# User profile helpers
# ---------------------------------------------------------------------------


def get_user_profile(uid: str) -> Optional[dict]:
    db = get_db()
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        return None
    return {"uid": uid, **doc.to_dict()}


def upsert_user_profile(uid: str, data: dict) -> None:
    db = get_db()
    db.collection("users").document(uid).set(data, merge=True)
