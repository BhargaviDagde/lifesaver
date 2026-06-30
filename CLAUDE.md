# CLAUDE.md — Hard Constraints for Last-Minute Life Saver

Read this file at the start of every session. These constraints do not change without explicit user confirmation.

## Stack Change Note (applied retroactively)
GCP billing could not be enabled. The following substitutions apply to the ENTIRE project:
- **Vertex AI → Gemini Developer API** (AI Studio, `GOOGLE_API_KEY`, no billing)
- **Cloud Run → Render** (free tier Docker container)
- **Cloud Scheduler → cron-job.org** (free external cron, shared-secret auth)
Everything else (Firebase, Firestore, FCM, App Hosting, Calendar API, Gmail API, ADK) is unchanged.

## Model Names (verified June 2026)
- **Text/agent backbone:** `gemini-flash-latest` via **Gemini Developer API** (AI Studio)
  - ⚠️ Do NOT use Vertex AI / ADC / service account keys for LLM calls
  - ⚠️ Do NOT use `gemini-2.5-flash` — retired, will 404
  - Free tier on AI Studio covers Flash family. Pro models are paid-only.
- **Voice (Live API):** `gemini-flash-latest` (confirm live model alias at https://ai.google.dev/gemini-api/docs/live-api)

## ADK Configuration — Developer API Mode
```python
# The ONLY correct way to init ADK for this project:
# Set env vars:  GOOGLE_API_KEY=<key>  GOOGLE_GENAI_USE_VERTEXAI=false
# Then just use LlmAgent / SequentialAgent normally — ADK reads these env vars automatically.
# NO google.cloud.aiplatform imports. NO ApplicationDefault(). NO service account keys.
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "false"  # or set in .env
os.environ["GOOGLE_API_KEY"] = "<key from AI Studio>"
```

## Google Cloud Project
- **Project ID:** `lifesaver-501004`
- **Used for:** Firestore, Calendar API, Gmail API, Firebase Auth — NOT for Vertex AI
- **Firebase Admin SDK init:** Use `project_id` param directly — no ADC needed for Firestore locally

## Firebase
- **Project:** `lifesaver-501004`
- **Auth provider:** Google (signInWithPopup)
- **authDomain:** `lifesaver-501004.firebaseapp.com`
- **messagingSenderId:** `989807541983`

## Environment Variables
```
# Backend
GOOGLE_CLOUD_PROJECT=lifesaver-501004
GOOGLE_API_KEY=<from AI Studio>
GOOGLE_GENAI_USE_VERTEXAI=false
GOOGLE_OAUTH_CLIENT_ID=<oauth client id>
GOOGLE_OAUTH_CLIENT_SECRET=<oauth client secret>
TOKEN_ENCRYPTION_KEY=<fernet key>
CRON_SECRET=<random secret for cron endpoint>
FRONTEND_URL=<app hosting url>
BACKEND_URL=<render service url>
SKIP_SCHEDULER_AUTH=true  # local dev only

# Frontend
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDwa6MA2U3NMJ7U7row9lQhiNf1p0bM450
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=lifesaver-501004.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=lifesaver-501004
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=lifesaver-501004.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=989807541983
NEXT_PUBLIC_FIREBASE_APP_ID=1:989807541983:web:27b4554391851ce2f8336a
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BFQVEbEoAb27g19_BcXOebvDg4F8r2m5nnCj_0_9T7gl5WsYYe41Q-vWwfp7JRvIWuCfcWOwV-8ou4xyJD7GDl0
NEXT_PUBLIC_BACKEND_URL=<render service url>
```

## Deployment Stack
- **Frontend:** Firebase App Hosting (unchanged)
- **Backend:** Render free tier (Docker container)
- **Cron:** cron-job.org → POST /internal/monitor-sweep with `X-Cron-Secret` header

## Cron Endpoint Security
- NOT Cloud Scheduler OIDC — replaced with shared secret
- Header: `X-Cron-Secret: <CRON_SECRET env var>`
- Local dev: set `SKIP_SCHEDULER_AUTH=true` to bypass

## What NOT to do
- Never commit `.env` files or service-account JSON
- Never import `google.cloud.aiplatform` or use `credentials.ApplicationDefault()` for LLM calls
- Never use `GOOGLE_GENAI_USE_VERTEXAI=true`
- Never use `gemini-2.5-flash`
- Never connect frontend mic directly to Google's Live API
- Never store raw refresh tokens — always encrypt with TOKEN_ENCRYPTION_KEY

## ADK Version
- Installed: `google-adk==2.3.0`
- Docs: https://google.github.io/adk-docs/
