"""
Notification routes — FCM token registration.
"""

import logging
from fastapi import APIRouter, Request
from pydantic import BaseModel
from services.auth_middleware import verify_firebase_token
from tools.fcm_tools import register_fcm_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications")


class RegisterTokenRequest(BaseModel):
    token: str


@router.post("/register-token")
async def register_token(body: RegisterTokenRequest, request: Request):
    """Register an FCM token for push notifications."""
    uid = await verify_firebase_token(request)
    register_fcm_token(uid, body.token)
    return {"status": "registered"}
