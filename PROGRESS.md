# PROGRESS.md — Last-Minute Life Saver

Read this at the start of every session to know exactly where things stand.

---

## Current Phase: Phase 4 — Gmail Passive Intake

---

## Completed

### Phase 0 — Scaffold (session 1)
- [x] Git repo, SPEC.md, CLAUDE.md, PROGRESS.md
- [x] Full project scaffold (52 files)
- [x] .gitignore, .env.example

### Phase 1 — Auth & Task Management
- [x] Firebase Auth Google sign-in
- [x] Auth context + auth guard on all app pages
- [x] Firestore user profile creation on first sign-in
- [x] Real-time task list via onSnapshot
- [x] Task CRUD (add/edit/complete/delete)
- [x] TaskCard component with status badges, priority reasoning
- [x] Activity feed (live from Firestore)

### Phase 2 — Core Agent Pipeline
- [x] ADK SequentialAgent: Intake → Prioritizer → Scheduler
- [x] LLM backend: Groq (Llama 3.3 70B) via LiteLLM (Gemini quota unavailable)
- [x] Pipeline tested end-to-end: "essay due Friday, 3 hours" → title/deadline/priority/slot
- [x] Firestore Admin SDK connected (service account key)
- [x] Insights Agent + /insights route
- [x] Stack changes: Vertex AI → Gemini Dev API → Groq, Cloud Run → Render, Cloud Scheduler → cron-job.org

### Phase 3 — Monitor Agent ⭐
- [x] Monitor Agent: sweeps all users, detects at-risk tasks
- [x] LLM generates calm, specific notification copy
- [x] Calendar reschedule attempt on at-risk tasks
- [x] Task status updated to at_risk in Firestore
- [x] Activity log entry written (visible in /activity feed)
- [x] FCM token registration (frontend + backend)
- [x] Service worker for background push notifications
- [x] Tested: task flagged, status changed, activity log written ✅

---

## Not Yet Done
- [ ] Phase 4 — Gmail Passive Intake
- [ ] Phase 5 — Voice
- [ ] Phase 6 — Polish + Deploy

---

## Deployed URLs
- Frontend: _(not yet deployed — running locally at localhost:3000)_
- Backend: _(not yet deployed — running locally at localhost:8080)_

---

## Decisions & Deviations from Spec

| Decision | Reason |
|---|---|
| Groq (Llama 3.3 70B) via LiteLLM instead of Gemini | Google Cloud billing unavailable; Groq free tier works without any billing |
| Render instead of Cloud Run | No billing required |
| cron-job.org + shared secret instead of Cloud Scheduler OIDC | No billing required; functionally equivalent |
| Scheduler Agent: no ADK tools, LLM reasons over pre-fetched busy blocks | Groq/Llama tool-call format incompatible with ADK's function-calling schema |

---

## Session Log
- **Session 1:** Full scaffold committed.
- **Session 2:** Credentials wired, deps installed, stack change to Groq/Render/cron-job.org.
- **Session 3:** Phase 1 (auth + CRUD) + Phase 2 (agent pipeline) working end-to-end.
- **Session 4:** Phase 3 (Monitor Agent) complete and tested. At-risk detection, activity log, FCM registration all working.

---

## Completed

### Setup (session 1)
- [x] Git repo initialized at `lifesaver/`
- [x] `SPEC.md` written (full product specification)
- [x] `CLAUDE.md` written (hard constraints: model names, env vars, rules)
- [x] `PROGRESS.md` created (this file)
- [x] Full project scaffold created (see structure below)
- [x] `frontend/` — Next.js 15 + TypeScript + Tailwind, all page routes stubbed
- [x] `backend/` — FastAPI + placeholder agent/tool/route/service files
- [x] `firestore.rules` — security rules with oauth_tokens deny
- [x] `firestore.indexes.json`
- [x] `.gitignore` — excludes .env*, service-account JSON, etc.
- [x] `.env.example` — placeholder names only, no real values
- [x] `scripts/seed_demo_data.py` — placeholder
- [x] `scripts/deploy.sh` — placeholder

---

## Not Yet Done

### Phase 0 — Deploy Pipeline
- [ ] User provides: Google Cloud project ID, Firebase web config, OAuth client credentials, VAPID key
- [ ] Firebase App Hosting connected to repo (frontend)
- [ ] Cloud Run service deployed (backend hello world)
- [ ] Frontend calls backend and displays response — confirmed live

### Phase 1 — Auth & Manual Task Management
### Phase 2 — Core Agent Pipeline
### Phase 3 — Monitor, Insights, Activity Feed
### Phase 4 — Gmail Passive Intake
### Phase 5 — Voice
### Phase 6 — Polish & Submission

---

## Deployed URLs
- Frontend: _(not yet deployed)_
- Backend: _(not yet deployed)_

---

## Decisions & Deviations from Spec

| Decision | Reason |
|---|---|
| All agents scaffolded as stubs in phase 0 | Ensures structure is correct before implementing; easier to fill in than restructure later |
| Frontend pages created as minimal stubs | Validates routing before adding real content |

---

## Blocked On (needs user input)
- Google Cloud project ID → needed for `GOOGLE_CLOUD_PROJECT` env var and Firebase init
- Firebase web config → needed for `frontend/lib/firebase.ts`
- Google OAuth client ID + secret → needed for Calendar/Gmail offline flow
- VAPID key → needed for FCM web push

---

## Session Log
- **Session 1:** Full scaffold complete. 52 files across frontend, backend, agents, tools, routes, services, Firestore rules/indexes, scripts, and all 5 spec/tracking docs. Git committed as root commit `4a93e61`. Awaiting user credentials to proceed with deployment.
