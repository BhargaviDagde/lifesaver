#!/usr/bin/env bash
# deploy.sh — Deploy both frontend and backend to Google Cloud.
#
# Prerequisites:
#   gcloud auth login
#   gcloud config set project $GOOGLE_CLOUD_PROJECT
#   firebase login
#   firebase use $GOOGLE_CLOUD_PROJECT
#
# Usage:
#   bash scripts/deploy.sh [--backend-only | --frontend-only]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

REGION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
SERVICE_NAME="lifesaver-backend"
PROJECT="${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT}"

BACKEND_ONLY=false
FRONTEND_ONLY=false

for arg in "$@"; do
  case $arg in
    --backend-only)  BACKEND_ONLY=true ;;
    --frontend-only) FRONTEND_ONLY=true ;;
  esac
done

echo "=== Last-Minute Life Saver Deploy ==="
echo "Project: $PROJECT | Region: $REGION"

# ---------------------------------------------------------------------------
# Backend — build and deploy to Cloud Run
# ---------------------------------------------------------------------------
if [ "$FRONTEND_ONLY" = false ]; then
  echo ""
  echo "--- Deploying backend to Cloud Run ---"
  cd "$ROOT/backend"

  gcloud run deploy "$SERVICE_NAME" \
    --source . \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT,GOOGLE_CLOUD_LOCATION=$REGION,GOOGLE_GENAI_USE_VERTEXAI=true" \
    --set-secrets "GOOGLE_OAUTH_CLIENT_ID=GOOGLE_OAUTH_CLIENT_ID:latest,GOOGLE_OAUTH_CLIENT_SECRET=GOOGLE_OAUTH_CLIENT_SECRET:latest,TOKEN_ENCRYPTION_KEY=TOKEN_ENCRYPTION_KEY:latest" \
    --min-instances 0 \
    --max-instances 10 \
    --memory 1Gi \
    --cpu 1

  BACKEND_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region "$REGION" \
    --format "value(status.url)")

  echo "Backend deployed: $BACKEND_URL"

  # Update FRONTEND_URL env var on the service so CORS allows the App Hosting domain
  # (Run this again after frontend is deployed)
  gcloud run services update "$SERVICE_NAME" \
    --region "$REGION" \
    --set-env-vars "BACKEND_URL=$BACKEND_URL"
fi

# ---------------------------------------------------------------------------
# Frontend — deploy via Firebase App Hosting
# ---------------------------------------------------------------------------
if [ "$BACKEND_ONLY" = false ]; then
  echo ""
  echo "--- Deploying frontend to Firebase App Hosting ---"
  cd "$ROOT/frontend"

  # Install dependencies
  npm ci

  # Firebase App Hosting deploy
  firebase deploy --only hosting

  echo "Frontend deployed."
fi

echo ""
echo "=== Deploy complete ==="
if [ "$FRONTEND_ONLY" = false ]; then
  echo "Backend: $BACKEND_URL"
fi
echo ""
echo "Next steps:"
echo "  1. Set NEXT_PUBLIC_BACKEND_URL secret in Firebase Console to $BACKEND_URL"
echo "  2. Add the App Hosting domain to Google OAuth consent screen"
echo "  3. Update FRONTEND_URL on the Cloud Run service to the App Hosting URL"
echo "  4. Wire up Cloud Scheduler: POST $BACKEND_URL/internal/monitor-sweep every 20 min"
