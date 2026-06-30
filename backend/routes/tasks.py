"""
Task routes — create tasks via the agent pipeline, approve Gmail suggestions,
and handle manual edits/status changes.

Simple CRUD (list, mark done, delete) goes directly frontend → Firestore via
client SDK, so it's not duplicated here. These routes are for agent-involved operations.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services.auth_middleware import verify_firebase_token
from services.firestore_client import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks")


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class CreateTaskRequest(BaseModel):
    text: str  # free-text input, e.g. "essay due Friday, probably 3 hours of work"
    source: str = "manual"  # "manual" | "voice"


class PatchTaskRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    deadline: datetime | None = None
    estimatedMinutes: int | None = None
    status: str | None = None
    category: str | None = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("")
async def create_task(body: CreateTaskRequest, request: Request):
    """
    Create a task from free-text input. Triggers the
    Intake → Prioritizer → Scheduler agent pipeline.

    Phase 0: stub — returns a placeholder until agents are wired in Phase 2.
    """
    uid = await verify_firebase_token(request)

    # TODO Phase 2: run SequentialAgent pipeline (Intake → Prioritizer → Scheduler)
    # For now, return a stub response to validate the endpoint.
    logger.info("Task creation requested by uid=%s, text=%r", uid, body.text)

    return {
        "status": "queued",
        "message": "Task received. Agent pipeline will be wired in Phase 2.",
        "input": body.text,
    }


@router.patch("/{task_id}")
async def patch_task(task_id: str, body: PatchTaskRequest, request: Request):
    """Manual edits and status changes to an existing task."""
    uid = await verify_firebase_token(request)

    db = get_db()
    task_ref = db.collection("users").document(uid).collection("tasks").document(task_id)
    task_doc = task_ref.get()

    if not task_doc.exists:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updatedAt"] = datetime.now(timezone.utc)

    task_ref.update(updates)
    return {"status": "updated", "taskId": task_id}


@router.post("/{task_id}/approve")
async def approve_task(task_id: str, request: Request):
    """
    Approve a Gmail-suggested task (status: "inbox" → pipeline).
    Triggers Intake → Prioritizer → Scheduler for the already-parsed task.

    Phase 0: stub.
    """
    uid = await verify_firebase_token(request)

    db = get_db()
    task_ref = db.collection("users").document(uid).collection("tasks").document(task_id)
    task_doc = task_ref.get()

    if not task_doc.exists:
        raise HTTPException(status_code=404, detail="Task not found")

    task_data = task_doc.to_dict()
    if task_data.get("status") != "inbox":
        raise HTTPException(status_code=400, detail="Task is not in 'inbox' status")

    # TODO Phase 4: run pipeline on already-structured task data
    task_ref.update(
        {
            "status": "scheduled",
            "updatedAt": datetime.now(timezone.utc),
        }
    )

    return {"status": "approved", "taskId": task_id}
