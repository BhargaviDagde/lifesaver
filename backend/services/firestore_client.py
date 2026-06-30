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
import json
import base64
import logging
import tempfile
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

        # Option 1: base64-encoded service account JSON (Render/production)
        b64 = os.environ.get("FIREBASE_SERVICE_ACCOUNT_B64")
        if b64:
            logger.info("Firebase Admin: using base64 service account")
            sa_dict = json.loads(base64.b64decode(b64).decode("utf-8"))
            cred = credentials.Certificate(sa_dict)

        # Option 2: file path (local dev)
        elif os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") and \
             os.path.exists(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]):
            logger.info("Firebase Admin: using service account file")
            cred = credentials.Certificate(os.environ["GOOGLE_APPLICATION_CREDENTIALS"])

        # Option 3: Application Default Credentials
        else:
            logger.info("Firebase Admin: using ApplicationDefault")
            cred = credentials.ApplicationDefault()

        firebase_admin.initialize_app(cred, {"projectId": project_id})

    _db = firestore.client()
    return _db
