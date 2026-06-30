# Last-Minute Life Saver

An AI productivity companion that doesn't just remind you — it acts.

## What it is

Most reminder apps nag. Life Saver acts. It watches your calendar, spots deadlines in your email, schedules work blocks automatically, and — when something is about to slip — quietly moves things around and tells you exactly what it changed and why.

Built for a Google Technologies hackathon. Every feature maps to a real agent with real tools, not a single chatbot prompt wrapped in agent theater.

## Architecture (one paragraph)

A Next.js 15 frontend on Firebase App Hosting talks to a FastAPI backend on Cloud Run. The backend runs five specialized agents via Google's Agent Development Kit (ADK) with Gemini 3.5 Flash as the LLM backbone. New tasks flow through a SequentialAgent pipeline — Intake → Prioritizer → Scheduler — that parses text, scores urgency × importance, and books a calendar slot autonomously. A Monitor Agent runs every 20 minutes via Cloud Scheduler, scans all users' tasks for at-risk deadlines, sends FCM push notifications, and reschedules calendar blocks without any user interaction. Task data lives in Cloud Firestore with real-time `onSnapshot` listeners so the UI updates live when an agent changes something. OAuth refresh tokens for Calendar/Gmail background access are stored encrypted in Firestore (backend-only, denied to client reads by security rules).

## Model names (verified June 2026)

- Text/agent backbone: `gemini-3.5-flash` via Vertex AI
- Voice (Live API): `gemini-3.1-flash-live-preview` — confirm at https://ai.google.dev/gemini-api/docs/live-api before using (preview names rotate)
- **Do NOT use `gemini-2.5-flash`** — it has been retired and will 404

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Frontend hosting | Firebase App Hosting |
| Backend | FastAPI, Python 3.12 |
| Backend hosting | Google Cloud Run |
| Agent framework | Google ADK (`google-adk`) |
| LLM | Gemini 3.5 Flash via Vertex AI |
| Auth | Firebase Authentication (Google provider) |
| Database | Cloud Firestore |
| Push notifications | Firebase Cloud Messaging |
| Calendar | Google Calendar API v3 |
| Email intake | Gmail API (readonly) |
| Background jobs | Cloud Scheduler |
| Voice | Gemini Live API via ADK bidi-streaming |

## Setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- Google Cloud project with billing enabled
- Firebase project (same project)
- `gcloud` CLI authenticated
- `firebase` CLI installed

### 1. Clone and configure environment

```bash
git clone <repo>
cd lifesaver
cp .env.example .env
# Fill in .env with real values — see comments in the file
```

### 2. Google Cloud setup

```bash
# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com \
  calendar-json.googleapis.com \
  gmail.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com

# Create secrets in Secret Manager
echo -n "your-oauth-client-id" | gcloud secrets create GOOGLE_OAUTH_CLIENT_ID --data-file=-
echo -n "your-oauth-client-secret" | gcloud secrets create GOOGLE_OAUTH_CLIENT_SECRET --data-file=-

# Generate and store encryption key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" | \
  gcloud secrets create TOKEN_ENCRYPTION_KEY --data-file=-
```

### 3. Backend — local dev

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Set env vars (or use .env with python-dotenv)
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
export GOOGLE_GENAI_USE_VERTEXAI=true
export SKIP_SCHEDULER_AUTH=true  # local dev only

uvicorn main:app --reload --port 8080
# Visit http://localhost:8080
```

### 4. Frontend — local dev

```bash
cd frontend
npm install
# Copy .env.example to .env.local and fill in Firebase config
cp ../.env.example .env.local
npm run dev
# Visit http://localhost:3000
```

### 5. Deploy

```bash
bash scripts/deploy.sh
```

See `scripts/deploy.sh` for step-by-step deploy instructions.

### 6. Seed demo data

```bash
cd backend
pip install -r requirements.txt
export GOOGLE_CLOUD_PROJECT=your-project-id
python ../scripts/seed_demo_data.py --uid <your-firebase-uid>
```

Gets your uid from Firebase Console → Authentication → Users after signing in once.

## Demo script (60–90 seconds)

**Setup:** seed data loaded, browser open to `/activity`, Cloud Scheduler running.

1. **(10s) The problem:** "Most productivity apps just remind you. Life Saver acts."
   Show the dashboard — point out the at-risk Chemistry lab report.

2. **(20s) The Monitor Agent rescue:**
   "This task is at risk — the scheduled block is after the deadline. Watch the Activity feed."
   Wait for the Cloud Scheduler tick (or hit `/internal/monitor-sweep` manually).
   Show: FCM push notification arrives, activity feed updates with Monitor Agent entry,
   task status changes to `at_risk`, calendar event moves to a safe slot.
   Read the reasoning aloud: *"Deadline in 2.5 hours. Moved to [time] — the only open block before the deadline."*

3. **(15s) The agent pipeline:**
   Type "pay electricity bill by tomorrow, 10 minutes" in the quick-add bar.
   Show the Activity feed updating in sequence: Intake → Prioritizer → Scheduler.
   Open Google Calendar and show the new event.

4. **(10s) Voice (Phase 5):**
   Press the mic button: *"Add dentist appointment reminder for next Tuesday."*
   Show transcript appearing, then the task appearing in the task list.

5. **(10s) Insights:**
   Open `/insights`. Show the Gemini-generated recap and streak.
   Point out the coaching framing — not a failure scorecard.

6. **(5s) Close:**
   "One sign-in, and it's watching. That's the idea."

## Build phases

| Phase | Status | Description |
|---|---|---|
| 0 | ✅ Scaffolded | Skeleton + deploy pipeline |
| 1 | 🔲 | Auth + manual task management |
| 2 | 🔲 | Core agent pipeline + Calendar |
| 3 | 🔲 | Monitor, Insights, Activity feed |
| 4 | 🔲 | Gmail passive intake |
| 5 | 🔲 | Voice |
| 6 | 🔲 | Polish + submission |

## Production improvements (out of scope for hackathon)

- Split user-facing and background cron paths into separate Cloud Run services
- Add Cloud Tasks queue for agent jobs instead of synchronous execution
- Add rate limiting and per-user API quotas
- Implement token rotation for OAuth refresh tokens
- Add Firestore TTL policies for activity log cleanup
- Add OpenTelemetry tracing across the agent pipeline
