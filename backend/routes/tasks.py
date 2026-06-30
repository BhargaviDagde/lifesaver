"""
Task routes — create tasks via the agent pipeline, approve Gmail suggestions,
and handle manual edits/status changes.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services.auth_middleware import verify_firebase_token
from services.firestore_client import get_db
from tools.firestore_tools import create_task, update_task, log_agent_action, get_user_profile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks")


class CreateTaskRequest(BaseModel):
    text: str
    source: str = "manual"


class PatchTaskRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    deadline: datetime | None = None
    estimatedMinutes: int | None = None
    status: str | None = None
    category: str | None = None


@router.post("")
async def create_task_endpoint(body: CreateTaskRequest, request: Request):
    """
    Create a task from free-text input.
    Runs the Intake → Prioritizer → Scheduler pipeline.
    """
    uid = await verify_firebase_token(request)
    logger.info("Task creation: uid=%s, text=%r", uid, body.text[:80])

    # Import here to avoid slow startup
    from agents.orchestrator import run_new_task_pipeline

    # Get user profile for work hours / timezone
    profile = get_user_profile(uid) or {}
    work_start = profile.get("workHoursStart", 9)
    work_end = profile.get("workHoursEnd", 18)
    tz_str = profile.get("timezone", "America/Chicago")

    try:
        result = await run_new_task_pipeline(
            uid=uid,
            text=body.text,
            source=body.source,
            work_start=work_start,
            work_end=work_end,
            timezone_str=tz_str,
        )
    except Exception as e:
        logger.error("Pipeline error for uid=%s: %s", uid, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent pipeline failed: {str(e)}")

    # If the intake agent needs clarification, don't create a task yet
    if result.get("needsClarification"):
        return {
            "status": "needs_clarification",
            "question": result.get("clarificationQuestion", "Can you give me more details?"),
        }

    now = datetime.now(timezone.utc)
    task_id = str(uuid.uuid4())

    # Determine final status
    status = "scheduled" if result.get("scheduledStart") else "inbox"

    task_data = {
        "title": result["title"],
        "description": "",
        "source": body.source,
        "deadline": result.get("deadline"),
        "estimatedMinutes": result.get("estimatedMinutes"),
        "category": result.get("category", "other"),
        "priorityScore": result.get("priorityScore"),
        "priorityReasoning": result.get("priorityReasoning"),
        "status": status,
        "calendarEventId": result.get("calendarEventId"),
        "scheduledStart": result.get("scheduledStart"),
        "scheduledEnd": result.get("scheduledEnd"),
    }

    # Write task to Firestore
    db = get_db()
    task_ref = db.collection("users").document(uid).collection("tasks").document(task_id)
    task_ref.set({**task_data, "createdAt": now, "updatedAt": now})

    # Log agent actions for the activity feed
    _log_pipeline_actions(uid, task_id, result, body.text)

    return {
        "status": "created",
        "taskId": task_id,
        "title": result["title"],
        "priorityScore": result.get("priorityScore"),
        "scheduledStart": result.get("scheduledStart").isoformat() if result.get("scheduledStart") else None,
        "calendarConnected": result.get("calendarConnected", False),
    }


def _log_pipeline_actions(uid: str, task_id: str, result: dict, original_text: str):
    """Write intake → prioritizer → scheduler entries to the activity log."""

    # Intake
    log_agent_action(
        uid=uid,
        agent="intake",
        action=f"Parsed task: \"{result['title']}\"",
        reasoning=f"Extracted from: \"{original_text[:80]}\"",
        task_id=task_id,
    )

    # Prioritizer
    if result.get("priorityScore") is not None:
        log_agent_action(
            uid=uid,
            agent="prioritizer",
            action=f"Scored \"{result['title']}\" at {result['priorityScore']}/100",
            reasoning=result.get("priorityReasoning", ""),
            task_id=task_id,
        )

    # Scheduler
    if result.get("scheduledStart"):
        from datetime import datetime
        start = result["scheduledStart"]
        end = result.get("scheduledEnd")
        # Use cross-platform time formatting
        if hasattr(start, "strftime"):
            hour = start.strftime("%I").lstrip("0") or "12"
            ampm = start.strftime("%p").lower()
            time_str = f"{hour}:{start.strftime('%M')}{ampm}"
        else:
            time_str = str(start)
        action = f"Scheduled \"{result['title']}\" for {time_str}"
        if end and hasattr(end, "strftime"):
            h2 = end.strftime("%I").lstrip("0") or "12"
            action += f"–{h2}:{end.strftime('%M')}{end.strftime('%p').lower()}"
        log_agent_action(
            uid=uid,
            agent="scheduler",
            action=action,
            reasoning=result.get("schedulingReasoning", ""),
            task_id=task_id,
        )
    else:
        log_agent_action(
            uid=uid,
            agent="scheduler",
            action=f"Saved \"{result['title']}\" without scheduling",
            reasoning=result.get("schedulingReasoning", "Calendar not connected."),
            task_id=task_id,
        )


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
    Approve a Gmail-suggested task (status: inbox → run pipeline).
    Phase 2: runs the Prioritizer + Scheduler on the already-parsed task.
    """
    uid = await verify_firebase_token(request)

    db = get_db()
    task_ref = db.collection("users").document(uid).collection("tasks").document(task_id)
    task_doc = task_ref.get()
    if not task_doc.exists:
        raise HTTPException(status_code=404, detail="Task not found")

    task_data = task_doc.to_dict()
    if task_data.get("status") != "inbox":
        raise HTTPException(status_code=400, detail="Task is not in inbox status")

    # Re-run pipeline with the existing title as input
    title = task_data.get("title", "")
    profile = get_user_profile(uid) or {}

    from agents.orchestrator import run_new_task_pipeline
    try:
        result = await run_new_task_pipeline(
            uid=uid,
            text=title,
            source="gmail",
            work_start=profile.get("workHoursStart", 9),
            work_end=profile.get("workHoursEnd", 18),
            timezone_str=profile.get("timezone", "America/Chicago"),
        )
    except Exception as e:
        logger.error("Pipeline error on approve: %s", e)
        # Graceful fallback — just mark scheduled
        task_ref.update({"status": "scheduled", "updatedAt": datetime.now(timezone.utc)})
        return {"status": "approved", "taskId": task_id}

    now = datetime.now(timezone.utc)
    updates = {
        "status": "scheduled" if result.get("scheduledStart") else "inbox",
        "priorityScore": result.get("priorityScore"),
        "priorityReasoning": result.get("priorityReasoning"),
        "calendarEventId": result.get("calendarEventId"),
        "scheduledStart": result.get("scheduledStart"),
        "scheduledEnd": result.get("scheduledEnd"),
        "updatedAt": now,
    }
    task_ref.update({k: v for k, v in updates.items() if v is not None})
    _log_pipeline_actions(uid, task_id, result, title)

    return {"status": "approved", "taskId": task_id}
