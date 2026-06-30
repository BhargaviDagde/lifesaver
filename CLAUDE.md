# CLAUDE.md — Hard Constraints for Last-Minute Life Saver

Read this file at the start of every session. These constraints do not change without explicit user confirmation.

## Model Names (verified June 2026 — do not guess, verify before use)
- **Text/agent backbone:** `gemini-3.5-flash` via Vertex AI
  - ⚠️ Do NOT use `gemini-2.5-flash` — it has been retired and will 404
- **Voice (Live API):** `gemini-3.1-flash-live-preview`
  - ⚠️ Preview model names rotate — confirm at https://ai.google.dev/gemini-api/docs/live-api before implementing

## Google Cloud Project
- **Project ID:** _(ask user — do not invent)_
- **Region:** `us-central1`
- **Auth model:** Application Default Credentials (ADC) via Cloud Run service account — NO floating API keys

## Firebase
- **Project:** same as Google Cloud project
- **Auth provider:** Google (signInWithPopup)
- **Web config (apiKey, authDomain, etc.):** _(ask user — these are public/client-safe but must come from real project)_

## Required Secrets (all via Secret Manager, never hardcoded)
- `GOOGLE_OAUTH_CLIENT_ID` — from user
- `GOOGLE_OAUTH_CLIENT_SECRET` — from user  
- `TOKEN_ENCRYPTION_KEY` — generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`, store in Secret Manager
- `VAPID_KEY` — from user, for FCM web push

## ADK Version
- Install: `pip install google-adk`
- Before implementing any ADK integration, fetch current docs: https://google.github.io/adk-docs/
- Before implementing voice/streaming, read: https://google.github.io/adk-docs/streaming/

## OAuth Scopes for offline/background access
- Calendar: `https://www.googleapis.com/auth/calendar`
- Gmail: `https://www.googleapis.com/auth/gmail.readonly`
- Flow: authorization-code with `access_type=offline&prompt=consent`
- Callback: `POST /auth/google/callback` on backend
- Storage: `users/{uid}/oauth_tokens/google_workspace` — **backend-only via Admin SDK**

## Firestore Security Hardcoded Rules
- `users/{uid}/oauth_tokens/**` → DENY ALL client reads/writes
- Cross-user access → DENY everywhere
- Backend uses Admin SDK (bypasses rules)

## Environment Variable Names
```
GOOGLE_CLOUD_PROJECT
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
TOKEN_ENCRYPTION_KEY
NEXT_PUBLIC_BACKEND_URL
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY
```

## What NOT to do
- Never commit `.env` files or service-account JSON
- Never invent placeholder values that silently "work" in demo mode
- Never use `gemini-2.5-flash`
- Never connect frontend microphone directly to Google's Live API
- Never store raw refresh tokens — always encrypt with TOKEN_ENCRYPTION_KEY
