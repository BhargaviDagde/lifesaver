"""
FCM tools — send push notifications via Firebase Cloud Messaging.

Used by the Monitor Agent to deliver calm, specific, actionable notifications
when a task is at risk.

Copywriting rules (per spec section 6):
  ✅ "Your lab report is due in 3 hours — moved your 2pm block earlier, you're set"
  ✅ "Chemistry essay needs 2 hours, but Friday's filling up — grabbed Thursday 4–6pm"
  ❌ "URGENT: Task deadline approaching!"
  ❌ "Reminder: Complete task"
"""

import logging
from typing import Optional

import firebase_admin
from firebase_admin import messaging

from services.firestore_client import get_db

logger = logging.getLogger(__name__)


def send_task_notification(
    uid: str,
    title: str,
    body: str,
    task_id: Optional[str] = None,
    action_url: Optional[str] = None,
) -> dict:
    """
    Send a push notification to all registered FCM tokens for a user.
    Returns a dict with sent/failed counts.
    """
    db = get_db()
    user_doc = db.collection("users").document(uid).get()

    if not user_doc.exists:
        logger.warning("User %s not found for FCM notification", uid)
        return {"sent": 0, "failed": 0}

    user_data = user_doc.to_dict()
    fcm_tokens: list[str] = user_data.get("fcmTokens", [])

    if not fcm_tokens:
        logger.info("No FCM tokens for user %s — notification not sent", uid)
        return {"sent": 0, "failed": 0}

    data_payload = {}
    if task_id:
        data_payload["taskId"] = task_id
    if action_url:
        data_payload["url"] = action_url

    sent = 0
    failed = 0
    stale_tokens = []

    for token in fcm_tokens:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data_payload,
            token=token,
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title,
                    body=body,
                    icon="/icons/icon-192.png",
                    badge="/icons/badge-72.png",
                )
            ),
        )
        try:
            messaging.send(message)
            sent += 1
        except messaging.UnregisteredError:
            logger.info("Stale FCM token for user %s — queued for removal", uid)
            stale_tokens.append(token)
            failed += 1
        except Exception as e:
            logger.error("FCM send error for user %s: %s", uid, e)
            failed += 1

    # Clean up stale tokens
    if stale_tokens:
        remaining = [t for t in fcm_tokens if t not in stale_tokens]
        db.collection("users").document(uid).update({"fcmTokens": remaining})

    return {"sent": sent, "failed": failed}


def register_fcm_token(uid: str, token: str) -> None:
    """Add an FCM token to the user's token list (deduped)."""
    db = get_db()
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    if not user_doc.exists:
        logger.warning("User %s not found when registering FCM token", uid)
        return

    tokens: list[str] = user_doc.to_dict().get("fcmTokens", [])
    if token not in tokens:
        tokens.append(token)
        user_ref.update({"fcmTokens": tokens})
