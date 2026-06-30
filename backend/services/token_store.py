"""
Token store — encrypts/decrypts OAuth refresh tokens before persisting to Firestore.

Storage path: users/{uid}/oauth_tokens/google_workspace
This subcollection is DENIED to all client reads by Firestore security rules.
The backend always accesses it via Admin SDK (bypasses rules).
"""

import os
from datetime import datetime, timezone

from cryptography.fernet import Fernet
from firebase_admin import firestore

from services.firestore_client import get_db


def _get_fernet() -> Fernet:
    key = os.environ.get("TOKEN_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("TOKEN_ENCRYPTION_KEY environment variable is not set")
    return Fernet(key.encode() if isinstance(key, str) else key)


def store_tokens(uid: str, token_data: dict) -> None:
    """
    Encrypt and store OAuth tokens for a user.

    token_data should contain:
      - refresh_token: str
      - access_token: str (optional, short-lived)
      - scopes: list[str]
    """
    fernet = _get_fernet()
    refresh_token = token_data.get("refresh_token", "")
    encrypted = fernet.encrypt(refresh_token.encode()).decode()

    db = get_db()
    doc_ref = (
        db.collection("users")
        .document(uid)
        .collection("oauth_tokens")
        .document("google_workspace")
    )
    doc_ref.set(
        {
            "refreshTokenEncrypted": encrypted,
            "scopes": token_data.get("scopes", []),
            "connectedAt": datetime.now(timezone.utc),
        }
    )


def get_refresh_token(uid: str) -> str | None:
    """Retrieve and decrypt the stored refresh token for a user."""
    db = get_db()
    doc_ref = (
        db.collection("users")
        .document(uid)
        .collection("oauth_tokens")
        .document("google_workspace")
    )
    doc = doc_ref.get()
    if not doc.exists:
        return None

    data = doc.to_dict()
    encrypted = data.get("refreshTokenEncrypted")
    if not encrypted:
        return None

    fernet = _get_fernet()
    return fernet.decrypt(encrypted.encode()).decode()


def delete_tokens(uid: str) -> None:
    """Remove stored OAuth tokens for a user (e.g. on disconnect)."""
    db = get_db()
    (
        db.collection("users")
        .document(uid)
        .collection("oauth_tokens")
        .document("google_workspace")
        .delete()
    )
