"""
Firestore client — initializes Firebase Admin SDK and exposes a typed db handle.
Uses Application Default Credentials on Cloud Run; for local dev, set
GOOGLE_APPLICATION_CREDENTIALS to a service-account key path.
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os

_app = None
_db = None


def get_db():
    """Return the shared Firestore client, initializing Firebase Admin on first call."""
    global _app, _db
    if _db is None:
        if not firebase_admin._apps:
            # On Cloud Run, ADC picks up the service account automatically.
            # Locally, GOOGLE_APPLICATION_CREDENTIALS env var points to key file.
            cred = credentials.ApplicationDefault()
            _app = firebase_admin.initialize_app(
                cred,
                {"projectId": os.environ["GOOGLE_CLOUD_PROJECT"]},
            )
        _db = firestore.client()
    return _db
