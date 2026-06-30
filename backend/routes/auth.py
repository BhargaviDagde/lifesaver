"""
Auth routes — handles the OAuth 2.0 authorization-code flow for
Calendar + Gmail offline access (separate from Firebase Auth session).

Endpoints:
  GET  /auth/google/authorize  — redirect user to Google consent screen
  GET  /auth/google/callback   — exchange code for tokens, store encrypted
  DELETE /auth/google/disconnect — remove stored tokens
"""

import os
import logging
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from services.auth_middleware import verify_firebase_token
from services.token_store import store_tokens, delete_tokens
from services.firestore_client import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.readonly",
]


def _get_redirect_uri() -> str:
    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8080")
    return f"{backend_url}/auth/google/callback"


@router.get("/google/authorize")
async def google_authorize(request: Request):
    """
    Start the OAuth flow. The frontend calls this endpoint after the user
    clicks "Connect Calendar & Gmail" in onboarding/settings.

    Requires: Firebase ID token in Authorization header.
    Returns: redirect to Google consent screen.
    """
    uid = await verify_firebase_token(request)

    client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="OAuth client not configured")

    params = {
        "client_id": client_id,
        "redirect_uri": _get_redirect_uri(),
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",  # force refresh_token to be returned
        "state": uid,  # pass uid through so we can store tokens on callback
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(code: str, state: str, request: Request):
    """
    Google redirects here after the user grants consent.
    Exchange the authorization code for tokens and store the encrypted
    refresh token in Firestore under users/{uid}/oauth_tokens/google_workspace.
    """
    uid = state  # we passed uid as the state parameter

    client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="OAuth client not configured")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": _get_redirect_uri(),
                "grant_type": "authorization_code",
            },
        )

    if resp.status_code != 200:
        logger.error("Token exchange failed: %s", resp.text)
        raise HTTPException(status_code=400, detail="Failed to exchange authorization code")

    token_data = resp.json()

    if "refresh_token" not in token_data:
        logger.error("No refresh_token in response — user may have already granted access")
        raise HTTPException(
            status_code=400,
            detail="No refresh token returned. Please revoke access at myaccount.google.com/permissions and try again.",
        )

    # Encrypt and store
    store_tokens(
        uid=uid,
        token_data={
            "refresh_token": token_data["refresh_token"],
            "access_token": token_data.get("access_token"),
            "scopes": SCOPES,
        },
    )

    # Update user document to reflect connected status
    db = get_db()
    db.collection("users").document(uid).update(
        {
            "googleCalendarConnected": True,
            "gmailConnected": True,
        }
    )

    # Redirect back to frontend settings/onboarding with success signal
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(url=f"{frontend_url}/onboarding?connected=true")


@router.delete("/google/disconnect")
async def google_disconnect(request: Request):
    """Remove stored OAuth tokens and mark user as disconnected."""
    uid = await verify_firebase_token(request)
    delete_tokens(uid)

    db = get_db()
    db.collection("users").document(uid).update(
        {
            "googleCalendarConnected": False,
            "gmailConnected": False,
        }
    )
    return {"status": "disconnected"}
