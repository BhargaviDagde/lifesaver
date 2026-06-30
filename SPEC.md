# Last-Minute Life Saver — Full Product Specification
**Slug:** lifesaver | **Hackathon:** Google Technologies

---

## 0. Orientation

- This file is the source of truth. Read it at the start of every session.
- See `PROGRESS.md` for current build state and decisions.
- See `CLAUDE.md` for hard constraints (model names, project IDs, region).

### Key discipline rules
- **Before implementing any Google API integration**, fetch the current docs at the URL given in that section. Do not assume training data is current.
- **Never invent or stub a real secret.** If a credential, API key, or project ID is needed, stop and ask.
- **git commit after every phase** completes its Definition of Done — not before.

---

## 1. Product Vision

A user signs in, and from then on the app is doing three things continuously:
1. Figuring out what actually matters and when it's due
2. Finding time for it before they have to ask
3. Stepping in — unprompted — when something is about to be missed

Personality: a calm, competent friend who's already on it — not a nagging app.

| Brief Feature | Where it lives |
|---|---|
| Intelligent task prioritization | Prioritizer Agent |
| AI-powered scheduling assistance | Scheduler Agent + Calendar API |
| Personalized productivity recommendations | Insights Agent |
| Context-aware reminders | Monitor Agent's reasoned, specific pushes |
| Calendar integration | Google Calendar API v3 |
| Goal and habit tracking | Insights Agent (streaks, completion rate, category trends) |
| Voice-enabled assistance | Gemini Live API via ADK bidi-streaming |
| Autonomous task planning and execution | Monitor Agent acts without being asked; Scheduler books time without being asked |

---

## 2. Non-Negotiable Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15+ (App Router, TypeScript, Tailwind) | SSR support needed for App Hosting |
| Frontend hosting | Firebase App Hosting | Keeps stack inside Google ecosystem; GA, native Next.js support |
| Backend | FastAPI on Cloud Run, Python 3.12 | ADK is Python-first; Cloud Run is ADK's first-class deployment target |
| Agent framework | Google Agent Development Kit (`pip install google-adk`) | Real multi-agent system for "Agentic Depth" score |
| LLM backbone | Gemini 3.5 Flash (`gemini-3.5-flash`) via Vertex AI | Current GA flash model for agentic + coding workloads. **Do NOT use gemini-2.5-flash — retired, will 404.** |
| Auth | Firebase Authentication (Google provider) | Session/identity layer |
| Database | Cloud Firestore | Free real-time listeners for live UI updates when agent changes something |
| Push notifications | Firebase Cloud Messaging (web push) | Monitor Agent's delivery mechanism |
| Scheduling integration | Google Calendar API v3 | Scheduler Agent's tool surface |
| Passive intake | Gmail API (readonly) | Intake Agent's secondary source |
| Background trigger | Cloud Scheduler → Cloud Run HTTPS endpoint | Makes Monitor Agent run 24/7 without user request |
| Voice | Gemini Live API via ADK bidi-streaming, proxied through Cloud Run backend | See section 7 |
| Auth model for Vertex AI | Application Default Credentials via Cloud Run service account | No API keys to leak or rotate |
| Region | us-central1 | Broadest service availability, cheapest |

---

## 3. Architecture

### Five Specialized Agents

```
Inputs
├── Voice input (Gemini Live API via ADK)
├── Web app (Next.js)
└── Gmail inbox (auto-detect tasks)
         ↓
   ADK Orchestrator
   Gemini 3.5 Flash backbone
         ↓
   ┌─────────────────────────────────────────┐
   │ Five Specialized Agents                 │
   │                                         │
   │  Sequential pipeline (new tasks):       │
   │  Intake → Prioritizer → Scheduler       │
   │                                         │
   │  On-demand: Insights                    │
   │                                         │
   │  Cron-triggered: Monitor                │
   └─────────────────────────────────────────┘
         ↓
   Google Cloud
   ├── Cloud Run (FastAPI service)
   ├── Vertex AI / Gemini 3.5 Flash + function calling
   ├── Firebase (Auth · Firestore · FCM)
   ├── Google Calendar API v3
   ├── Gmail API (readonly)
   └── Cloud Scheduler (every 20 min → Monitor)
```

### Orchestration Patterns

**New-task path** (manual, voice, or Gmail-approved):
`SequentialAgent` pipeline — Intake → Prioritizer → Scheduler — runs deterministically. Each step writes to shared session state; the next step reads it.

**Conversational/voice path:**
A root `LlmAgent` with the five agents wired as sub-agents/tools, handling free-form requests via dynamic delegation.

**Monitor Agent:**
Not part the conversational tree. Invoked directly by Cloud Scheduler HTTP call to `/internal/monitor-sweep`. Runs unattended across all users. Takes action with zero human-in-the-loop per cycle — this is the "autonomous task planning and execution" feature.

**Insights Agent:**
Runs on-demand when user opens the insights page.

**Deployment note for hackathon:**
Run all as one Cloud Run service. Splitting user-facing and background cron paths is a legitimate production improvement — document as "next step" in README.

---

## 4. Identity & OAuth — Two Separate Flows

**Firebase Auth (client-side):**
- `signInWithPopup + GoogleAuthProvider`
- Session layer — tells you who's logged in
- Gives Firebase ID token to authenticate calls to your own backend
- Does NOT give durable server-usable refresh token for Gmail/Calendar scopes

**OAuth 2.0 offline flow (for Monitor Agent background access):**
- Separate "Connect your Calendar & Email" step in onboarding + Settings
- `access_type=offline&prompt=consent`
- Scopes: `https://www.googleapis.com/auth/calendar` + `https://www.googleapis.com/auth/gmail.readonly`
- Redirect URI: `POST /auth/google/callback` on backend
- Backend exchanges code for tokens, encrypts refresh token, stores at `users/{uid}/oauth_tokens/google_workspace`
- Firestore security rules: **deny all client reads** of this subcollection

**User-facing explanation:**
Plain language explaining why you need calendar and email access, stated as what they get — not what permission scope you're requesting.

---

## 5. Data Model (Firestore)

```
users/{uid}
  email, displayName, photoURL, timezone
  workHoursStart, workHoursEnd, quietHoursStart, quietHoursEnd
  fcmTokens: string[]
  googleCalendarConnected: bool, gmailConnected: bool
  createdAt

users/{uid}/oauth_tokens/google_workspace
  [backend-only, never client-readable]
  refreshTokenEncrypted, scopes[], connectedAt

users/{uid}/tasks/{taskId}
  title, description
  source: "manual" | "voice" | "gmail"
  sourceRef (e.g. gmail message id, if applicable)
  deadline (timestamp), estimatedMinutes
  category: "assignment" | "bill" | "interview" | "meeting" | "other"
  priorityScore (0–100), priorityReasoning (1–2 sentences, shown in UI)
  status: "inbox" | "scheduled" | "in_progress" | "done" | "at_risk" | "missed" | "dismissed"
  calendarEventId, scheduledStart, scheduledEnd
  createdAt, updatedAt

users/{uid}/activity_log/{logId}
  agent: "intake" | "prioritizer" | "scheduler" | "monitor" | "insights"
  action (human-readable, e.g. "Moved 'Lab report' to 2:15–3:00pm Thursday")
  reasoning, taskId (optional), createdAt

users/{uid}/insights_snapshots/{period}
  tasksCompleted, tasksMissed, onTimeRate, currentStreak, categoryBreakdown{}, generatedAt
```

**Firestore security rules summary:**
- User may read/write everything under their own `users/{uid}/**` EXCEPT `oauth_tokens`
- `oauth_tokens` denied to ALL client access regardless of uid match
- Cross-user access denied everywhere
- Backend uses Admin SDK (bypasses rules)

---

## 6. Agent Specifications

### Intake Agent
- **Input:** Free text (typed, voice transcript, or email body)
- **Output:** Structured task object (title, deadline, estimated duration, category) OR "not enough information, ask the user X"
- **Pattern:** ADK structured output or `propose_task(...)` tool function
- **Gmail-sourced:** Write tasks with `status: "inbox"` (pending user one-tap approval) — never fully silent
- **Voice/manual:** Proceed straight to Prioritizer without approval step

### Prioritizer Agent
- **Tools:** read task list, read deadline
- **Scoring:** Hybrid — deterministic urgency component (inverse of time remaining) + LLM-assessed importance/effort component
- **Output:** `priorityScore` (0–100) + `priorityReasoning` (1–2 sentences shown in UI)
- **Why hybrid:** Explainable to judges; genuinely smart (job interview outranks routine bill at same time-to-deadline)

### Scheduler Agent
- **Tools:**
  - `list_busy_blocks(start, end)` — Calendar freebusy
  - `create_calendar_event(title, start, end, description)`
  - `update_calendar_event(event_id, start, end)`
  - `delete_calendar_event(event_id)`
- **Logic:** Finds open slot inside work hours, before deadline, working backward from deadline (closer deadlines get earlier slots)
- **Writes back:** `calendarEventId`, `scheduledStart`, `scheduledEnd` to task + activity log entry

### Monitor Agent
- **Trigger:** Cloud Scheduler → `POST /internal/monitor-sweep` every ~20 min
- **At-risk conditions:**
  - Deadline within configurable window (e.g. 4 hours) and status isn't `done`
  - Scheduled block already passed without task being marked in-progress/done
- **Actions per at-risk task:**
  - Send FCM push with specific, calm, reasoned copy
  - Autonomously re-block new calendar slot where sensible
  - Log the change
- **Security:** Verify request comes from Cloud Scheduler's service account via OIDC token

### Insights Agent
- **Trigger:** On-demand from `/insights`
- **Output:** Completion rate, current streak, category breakdown, short natural-language recap
- **Tone:** Pattern-noticing and coaching — NEVER a scorecard of failures
  - ✅ "Bills tend to slip for you, want me to schedule them two days earlier next time?"
  - ❌ "You missed 3 deadlines this month."

---

## 7. Voice Architecture

**Pattern:** Frontend → WebSocket to Cloud Run backend → ADK bidi-streaming → Gemini Live API

**Why NOT direct frontend → Live API:**
- Would require duplicating all tool definitions (task creation, scheduling, querying) in a separate voice session
- Bypasses business logic already built for text path

**ADK classes to use:** `LiveRequestQueue`, `Runner.run_live()`, `RunConfig`

**Reference docs:** https://google.github.io/adk-docs/streaming/ (five-part guide — read before implementing)

**Voice model:** `gemini-3.1-flash-live-preview` — confirm at https://ai.google.dev/gemini-api/docs/live-api before using (preview model names rotate)

**UI requirement:** Show live transcript alongside audio for accessibility and judge visibility.

---

## 8. Backend API Surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/auth/google/callback` | GET | OAuth code exchange for Calendar/Gmail offline access |
| `/tasks` | POST | Create task from manual text → triggers Intake→Prioritizer→Scheduler |
| `/tasks/{id}` | PATCH | Manual edits, status changes |
| `/tasks/{id}/approve` | POST | Approve Gmail-suggested task → triggers pipeline |
| `/voice/ws` | WebSocket | Bidi-streaming relay for voice (section 7) |
| `/insights` | GET | Triggers Insights Agent, returns recap |
| `/internal/monitor-sweep` | POST | Cloud Scheduler target — OIDC-verified |
| `/internal/gmail-scan` | POST | Optional second Cloud Scheduler target for inbox scanning (Phase 4) |

**Simple task CRUD** (listing, marking done, deleting): Next.js → Firestore directly via client SDK with `onSnapshot` listeners. This means Monitor Agent background reschedules appear in UI live without refresh.

---

## 9. Frontend Pages & Design

### Pages
- `/login`
- `/onboarding` — explain + request calendar/email connection, set work hours
- `/dashboard` — today's priorities, at-risk tasks surfaced, quick-add bar, mic button
- `/tasks` — full list, filterable
- `/calendar` — AI-scheduled blocks vs. existing events
- `/insights`
- `/activity` — plain-language feed of what each agent did and why (**most important page for demonstrating Agentic Depth to a judge**)
- `/settings`

### Design Direction

**Core brief:** "Catching a task before it falls, calmly" — embody this, don't alarm.

**Palette (derived from calm competence under deadline pressure):**
- `#1E2A3A` — deep slate blue (primary background/text)
- `#2D7DD2` — confident sky blue (primary action)
- `#38B2AC` — teal (success/scheduled states)
- `#F6AE2D` — warm amber (at-risk — warm urgency, not alarm-red)
- `#F7F9FC` — near-white (surface/card backgrounds)
- `#6B7A8D` — mid-grey-blue (secondary text, borders)

**Avoid:**
- Red alert colors for urgency
- Cream background + serif + terracotta (generic AI app)
- Near-black + neon accent
- Hairline-rule broadsheet look

**Copy guidelines:**
- Active voice, specific: "Moved to 2:15pm — there's a free slot before your study group"
- NOT: "Task rescheduled"
- Error/empty states: say what happened and what to do next, no apologizing
- Responsive down to mobile, visible keyboard focus states

---

## 10. Repo Structure

```
lifesaver/
├── SPEC.md
├── CLAUDE.md
├── PROGRESS.md
├── README.md
├── architecture.md
├── frontend/                      (Next.js, deployed via Firebase App Hosting)
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   ├── insights/
│   │   ├── activity/
│   │   ├── settings/
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/                       (firebase.ts, api.ts, voice.ts)
│   ├── apphosting.yaml
│   └── package.json
├── backend/                       (FastAPI + ADK, deployed to Cloud Run)
│   ├── main.py
│   ├── agents/
│   │   ├── orchestrator.py
│   │   ├── intake_agent.py
│   │   ├── prioritizer_agent.py
│   │   ├── scheduler_agent.py
│   │   ├── monitor_agent.py
│   │   └── insights_agent.py
│   ├── tools/
│   │   ├── calendar_tools.py
│   │   ├── gmail_tools.py
│   │   ├── fcm_tools.py
│   │   └── firestore_tools.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── tasks.py
│   │   ├── voice.py
│   │   └── internal.py
│   ├── services/
│   │   ├── firestore_client.py
│   │   ├── token_store.py
│   │   └── auth_middleware.py
│   ├── requirements.txt
│   └── Dockerfile
├── firestore.rules
├── firestore.indexes.json
└── scripts/
    ├── seed_demo_data.py
    └── deploy.sh
```

---

## 11. Environment Variables & Secrets

| Variable | Where | Notes |
|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | backend | from user |
| `GOOGLE_CLOUD_LOCATION` | backend | `us-central1` |
| `GOOGLE_GENAI_USE_VERTEXAI` | backend | `true` — use Vertex AI + ADC, no floating API key |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | backend, via Secret Manager | from user, for Gmail/Calendar offline flow |
| `TOKEN_ENCRYPTION_KEY` | backend, via Secret Manager | generate one, used to encrypt stored refresh tokens at rest |
| Firebase web config | frontend | from user — public/client-safe, normal for Firebase |
| `NEXT_PUBLIC_BACKEND_URL` | frontend | Cloud Run service URL once deployed |
| `VAPID_KEY` | frontend | from user, for FCM web push |

**Rules:**
- `.env.example` with placeholder names only
- Never a `.env` with real values committed
- `.gitignore` excludes `.env*` and any service-account JSON

---

## 12. Build Phases

### Phase 0 — Skeleton & Deploy Pipeline
Scaffold both apps, wire env vars, get "hello world" Next.js on Firebase App Hosting + "hello world" FastAPI on Cloud Run talking to each other.
**Done when:** public URL shows a page that successfully calls the backend and displays the response.

### Phase 1 — Auth & Manual Task Management
Firebase Auth Google sign-in, Firestore schema + security rules, manual task CRUD (add/edit/complete/delete), no AI yet.
**Done when:** real user can sign in and manage a task list end to end, deployed.

### Phase 2 — Core Agent Pipeline
ADK installed, Intake → Prioritizer → Scheduler sequential pipeline wired to text input, Calendar OAuth (offline flow from section 4), Scheduler Agent actually creating calendar events.
**Done when:** typing "essay due Friday, probably 3 hours of work" results in a calendar event in the user's real Google Calendar.

### Phase 3 — Monitor, Insights, and Activity Feed ⭐
Cloud Scheduler cron → `/internal/monitor-sweep`, FCM push working, Monitor Agent rescuing at-risk demo task, Insights Agent producing recap, `/activity` feed showing agent reasoning.
**Done when:** you can demo a task deliberately let go "at risk" and watch the Monitor Agent push a notification and reschedule it, unprompted. **This is the single most important demo moment — protect time for it.**

### Phase 4 — Gmail Passive Intake
Gmail readonly scope added to offline OAuth flow, periodic inbox scan, suggested-tasks-pending-approval UI.
**Done when:** a test email with a deadline shows up as a suggested task the user can approve in one tap.

### Phase 5 — Voice
ADK bidi-streaming, mic button, live transcript.
**Done when:** spoken task flows through same pipeline as typed input and ends up on calendar.

### Phase 6 — Polish & Submission
Design pass, loading/empty/error states everywhere, mobile responsiveness, demo seed data script, README, architecture.md with updated Mermaid diagram, 60–90 second demo script.

---

## 13. Quality Bar

- No dead-end pages or buttons that do nothing
- No hardcoded secrets anywhere in committed code
- Firestore rules deny cross-user access and deny client reads of `oauth_tokens`
- Every external API call (Calendar, Gmail, Gemini) has error handling — degrades gracefully, never crashes the page
- `scripts/seed_demo_data.py` populates believable demo tasks including one deliberately at-risk task
- Mobile-responsive
- Visible keyboard focus states

---

## 14. Deliverables Checklist

- [ ] Live, public frontend URL
- [ ] Live, public (or appropriately secured) backend URL
- [ ] `README.md`: what it is, architecture paragraph, setup instructions, corrected model names
- [ ] `architecture.md`: final Mermaid diagram matching what was actually built
- [ ] Demo script (60–90 sec, built around Phase 3 rescue moment)
- [ ] Seed data script for clean demos

---

## 15. Evaluation Matrix

| Criterion | Weight | Primarily addressed by |
|---|---|---|
| Problem Solving & Impact | 20% | Monitor Agent's autonomous rescue; passive Gmail intake removes manual entry burden |
| Agentic Depth | 20% | Real ADK multi-agent system: sequential pipeline + dynamic root agent + independently-triggered scheduled agent |
| Innovation & Creativity | 20% | Voice-native interaction; passive email-derived task detection; transparent activity feed; proactive rescue |
| Usage of Google Technologies | 15% | Gemini 3.5 Flash, Gemini Live API, ADK, Firebase (Auth/Firestore/FCM/App Hosting), Cloud Run, Cloud Scheduler, Calendar API, Gmail API |
| Product Experience & Design | 10% | Calm, non-alarming visual and copy direction; clear onboarding consent |
| Technical Implementation | 10% | Correct OAuth refresh-token handling; Firestore security rules; encrypted token storage; explainable prioritization |
| Completeness & Usability | 5% | End-to-end deployed product, seed data, no dead ends |
