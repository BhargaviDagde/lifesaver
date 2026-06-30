"""
Firestore client — initializes Firebase Admin SDK and exposes a db handle.

Uses project ID from GOOGLE_CLOUD_PROJECT env var.
No Vertex AI, no Application Default Credentials, no service account key needed
for local dev — Firebase Admin SDK can authenticate via the project ID alone
when running against the real Firestore (not emulator).

For production (Render), set GOOGLE_APPLICATION_CREDENTIALS to a downloaded
Firebase Admin service account JSON, OR use the Firebase Admin SDK's default
credential lookup (which works on GCP-adjacent environments).
"""

import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger(__name__)

_db = None


def get_db():
    """Return the shared Firestore client, initializing Firebase Admin on first call."""
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "lifesaver-501004")

        # Check if a service account key is available (production on Render)
        sa_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if sa_path and os.path.exists(sa_path):
            logger.info("Firebase Admin: using service account key from %s", sa_path)
            cred = credentials.Certificate(sa_path)
        else:
            # Local dev / Render without a key file:
            # Use ApplicationDefault — works when GOOGLE_APPLICATION_CREDENTIALS
            # is set, OR falls back gracefully.
            # For pure local dev without any credentials, the Firebase Admin SDK
            # will still work for Firestore if the project allows it via rules.
            logger.info(
                "Firebase Admin: using ApplicationDefault for project %s", project_id
            )
            cred = credentials.ApplicationDefault()

        firebase_admin.initialize_app(cred, {"projectId": project_id})

    _db = firestore.client()
    return _db
