"""
Internal routes — called by external cron service (cron-job.org), not by the frontend.

Security: X-Cron-Secret header checked against CRON_SECRET env var.
Set SKIP_SCHEDULER_AUTH=true in local dev to bypass.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, BackgroundTasks
from services.auth_middleware import verify_cron_secret

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internal")


@router.post("/monitor-sweep")
async def monitor_sweep(request: Request, background_tasks: BackgroundTasks):
    """
    Cron target — triggered every ~20 min by cron-job.org.
    Returns immediately; sweep runs in background.
    """
    await verify_cron_secret(request)
    logger.info("Monitor sweep triggered")
    background_tasks.add_task(_run_monitor_sweep)
    return {"status": "ok", "message": "Monitor sweep started."}


@router.post("/gmail-scan")
async def gmail_scan(request: Request, background_tasks: BackgroundTasks):
    """
    Cron target — periodic Gmail inbox scan.
    Surfaces suggested tasks (status=inbox) pending user approval.
    """
    await verify_cron_secret(request)
    logger.info("Gmail scan triggered")
    background_tasks.add_task(_run_gmail_scan)
    return {"status": "ok", "message": "Gmail scan started."}


# ---------------------------------------------------------------------------
# Background task runners
# ---------------------------------------------------------------------------

async def _run_monitor_sweep():
    try:
        from agents.monitor_agent import run_monitor_sweep
        result = await run_monitor_sweep()
        logger.info("Monitor sweep finished: %s", result)
    except Exception as e:
        logger.error("Monitor sweep failed: %s", e, exc_info=True)


async def _run_gmail_scan():
    """
    Scan Gmail for all connected users. For each email that looks like a task,
    run the Intake Agent and create a status=inbox task for user approval.
    """
    try:
        from services.firestore_client import get_db
        from services.token_store import get_refresh_token
        from tools.gmail_tools import scan_inbox_for_tasks
        from agents.intake_agent import build_intake_agent
        from agents.model_config import get_model
        from tools.firestore_tools import log_agent_action
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai import types as genai_types
        import json

        db = get_db()
        users = list(db.collection("users").where("gmailConnected", "==", True).stream())
        logger.info("Gmail scan: %d connected users", len(users))

        for user_doc in users:
            uid = user_doc.id
            try:
                await _scan_user_gmail(uid, db)
            except Exception as e:
                logger.error("Gmail scan error for uid=%s: %s", uid, e)

    except Exception as e:
        logger.error("Gmail scan failed: %s", e, exc_info=True)


async def _scan_user_gmail(uid: str, db):
    """Scan one user's Gmail and create inbox tasks."""
    from tools.gmail_tools import scan_inbox_for_tasks
    from agents.intake_agent import build_intake_agent
    from tools.firestore_tools import log_agent_action
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types as genai_types
    import json

    APP_NAME = "lifesaver"

    emails = scan_inbox_for_tasks(uid, max_results=15)
    if not emails:
        return

    # Check which message_ids we've already processed
    existing_refs = set(
        doc.to_dict().get("sourceRef", "")
        for doc in db.collection("users").document(uid).collection("tasks")
            .where("source", "==", "gmail").stream()
    )

    new_tasks = 0
    for email in emails:
        msg_id = email["message_id"]
        if msg_id in existing_refs:
            continue  # already processed

        # Run Intake Agent on this email
        intake_text = f"""Subject: {email['subject']}
From: {email['from']}
Date: {email['date']}

{email['body_preview']}"""

        try:
            agent = build_intake_agent()
            session_service = InMemorySessionService()
            session_id = str(uuid.uuid4())
            await session_service.create_session(
                app_name=APP_NAME, user_id=uid, session_id=session_id
            )
            runner = Runner(agent=agent, app_name=APP_NAME, session_service=session_service)
            msg = genai_types.Content(role="user", parts=[genai_types.Part(text=intake_text)])

            async for event in runner.run_async(user_id=uid, session_id=session_id, new_message=msg):
                if event.is_final_response():
                    break

            session = await session_service.get_session(
                app_name=APP_NAME, user_id=uid, session_id=session_id
            )
            raw = session.state.get("parsed_task", "{}")
            parsed = _parse_json(raw)

            if parsed.get("needsClarification") or not parsed.get("title"):
                continue  # skip ambiguous emails

            # Create inbox task
            now = datetime.now(timezone.utc)
            task_id = str(uuid.uuid4())
            task_data = {
                "title": parsed["title"],
                "description": f"From: {email['from']}\nSubject: {email['subject']}",
                "source": "gmail",
                "sourceRef": msg_id,
                "deadline": _parse_dt(parsed.get("deadline")),
                "estimatedMinutes": parsed.get("estimatedMinutes"),
                "category": parsed.get("category", "other"),
                "status": "inbox",  # pending user approval
                "priorityScore": None,
                "priorityReasoning": None,
                "calendarEventId": None,
                "scheduledStart": None,
                "scheduledEnd": None,
                "createdAt": now,
                "updatedAt": now,
            }
            db.collection("users").document(uid).collection("tasks").document(task_id).set(
                {k: v for k, v in task_data.items() if v is not None}
            )

            log_agent_action(
                uid=uid,
                agent="intake",
                action=f"Detected task from email: '{parsed['title']}'",
                reasoning=f"Email from {email['from']} — subject: {email['subject'][:60]}. Waiting for your approval.",
                task_id=task_id,
            )
            new_tasks += 1

        except Exception as e:
            logger.warning("Intake failed for message %s: %s", msg_id, e)

    logger.info("Gmail scan for uid=%s: %d new tasks created", uid, new_tasks)


def _parse_json(value) -> dict:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        clean = value.strip()
        if clean.startswith("```"):
            lines = clean.split("\n")
            clean = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        try:
            import json
            return json.loads(clean)
        except Exception:
            pass
    return {}


def _parse_dt(val):
    if not val:
        return None
    try:
        from datetime import datetime
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except Exception:
        return None
