"""
Last-Minute Life Saver — FastAPI Backend
Mounts custom routes + ADK agent app on Cloud Run (Python 3.12)
"""

import logging
import os

# Load .env for local development (no-op in Cloud Run where env vars are set directly)
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.tasks import router as tasks_router
from routes.voice import router as voice_router
from routes.internal import router as internal_router
from routes.insights import router as insights_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App init
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Last-Minute Life Saver API",
    description="AI productivity companion backend — FastAPI + Google ADK",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS — restrict in production to your App Hosting domain
# ---------------------------------------------------------------------------

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth_router, tags=["auth"])
app.include_router(tasks_router, tags=["tasks"])
app.include_router(voice_router, tags=["voice"])
app.include_router(internal_router, tags=["internal"])
app.include_router(insights_router, tags=["insights"])

# ---------------------------------------------------------------------------
# Health / hello-world — Phase 0 smoke test
# ---------------------------------------------------------------------------


@app.get("/")
async def root():
    return {
        "service": "lifesaver-backend",
        "status": "ok",
        "message": "Last-Minute Life Saver API is running.",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
