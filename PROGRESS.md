# PROGRESS.md — Last-Minute Life Saver

Read this at the start of every session to know exactly where things stand.

---

## Current Phase: Phase 0 — Skeleton & Deploy Pipeline (SCAFFOLD COMPLETE — awaiting credentials to deploy)

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
