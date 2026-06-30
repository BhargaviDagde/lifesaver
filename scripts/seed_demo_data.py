#!/usr/bin/env python3
"""
seed_demo_data.py — Populate a test user's Firestore with believable demo tasks.

Includes one deliberately at-risk task (deadline within 3 hours) so the
Monitor Agent has something to act on during a demo.

Usage:
  export GOOGLE_CLOUD_PROJECT=your-project-id
  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
  python scripts/seed_demo_data.py --uid <firebase-user-uid>

The uid comes from Firebase Auth — sign in once and copy the uid from
Firebase Console → Authentication → Users.
"""

import argparse
import sys
import os
from datetime import datetime, timezone, timedelta

# Add backend to path so we can reuse firestore_client
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import firebase_admin
from firebase_admin import credentials, firestore


def init_firebase():
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(
            cred,
            {"projectId": os.environ["GOOGLE_CLOUD_PROJECT"]},
        )
    return firestore.client()


def seed(uid: str, db) -> None:
    now = datetime.now(timezone.utc)
    tasks_ref = db.collection("users").document(uid).collection("tasks")
    log_ref = db.collection("users").document(uid).collection("activity_log")

    # ------------------------------------------------------------------
    # Demo tasks — realistic, varied categories and statuses
    # ------------------------------------------------------------------
    tasks = [
        # 1. AT-RISK task — deadline in 2.5 hours (Monitor Agent bait)
        {
            "id": "demo-task-atrisk",
            "title": "Chemistry lab report",
            "description": "Complete the analysis section and submit to Canvas.",
            "source": "manual",
            "deadline": now + timedelta(hours=2, minutes=30),
            "estimatedMinutes": 90,
            "category": "assignment",
            "priorityScore": 91,
            "priorityReasoning": "Deadline in 2.5 hours — highest urgency. Lab reports affect your semester grade.",
            "status": "scheduled",
            "calendarEventId": "demo-cal-1",
            "scheduledStart": now + timedelta(hours=3),  # intentionally past deadline!
            "scheduledEnd": now + timedelta(hours=4, minutes=30),
            "createdAt": now - timedelta(hours=24),
            "updatedAt": now - timedelta(hours=24),
        },
        # 2. Job interview prep — high priority
        {
            "id": "demo-task-interview",
            "title": "Interview prep — Software Engineering internship",
            "description": "Review LeetCode patterns, prepare STAR stories, research company.",
            "source": "manual",
            "deadline": now + timedelta(days=1, hours=10),
            "estimatedMinutes": 120,
            "category": "interview",
            "priorityScore": 88,
            "priorityReasoning": "Job interview tomorrow morning. Career-impact stakes are high — this outranks routine tasks even at the same time pressure.",
            "status": "scheduled",
            "calendarEventId": "demo-cal-2",
            "scheduledStart": now + timedelta(hours=5),
            "scheduledEnd": now + timedelta(hours=7),
            "createdAt": now - timedelta(hours=12),
            "updatedAt": now - timedelta(hours=12),
        },
        # 3. Assignment due in 3 days
        {
            "id": "demo-task-essay",
            "title": "ECON 201 problem set",
            "description": "Chapters 8–10, 12 questions. Submit via Blackboard.",
            "source": "manual",
            "deadline": now + timedelta(days=3),
            "estimatedMinutes": 90,
            "category": "assignment",
            "priorityScore": 62,
            "priorityReasoning": "Due in 3 days with 90-minute estimate. Moderate urgency — scheduled in a comfortable window.",
            "status": "scheduled",
            "calendarEventId": "demo-cal-3",
            "scheduledStart": now + timedelta(days=1, hours=15),
            "scheduledEnd": now + timedelta(days=1, hours=16, minutes=30),
            "createdAt": now - timedelta(days=1),
            "updatedAt": now - timedelta(days=1),
        },
        # 4. Gmail-suggested task awaiting approval
        {
            "id": "demo-task-inbox",
            "title": "Submit housing application",
            "description": "Detected from email: housing@university.edu. Deadline October 15th.",
            "source": "gmail",
            "sourceRef": "msg-abc123",
            "deadline": now + timedelta(days=5),
            "estimatedMinutes": 30,
            "category": "other",
            "priorityScore": 55,
            "priorityReasoning": "Detected from email. 5-day deadline, 30-minute task. Approve to schedule.",
            "status": "inbox",
            "createdAt": now - timedelta(hours=2),
            "updatedAt": now - timedelta(hours=2),
        },
        # 5. Completed task (shows in insights)
        {
            "id": "demo-task-done",
            "title": "Pay rent",
            "description": "Venmo landlord for October.",
            "source": "manual",
            "deadline": now - timedelta(days=1),
            "estimatedMinutes": 5,
            "category": "bill",
            "priorityScore": 95,
            "priorityReasoning": "Bill due yesterday — completed on time.",
            "status": "done",
            "createdAt": now - timedelta(days=3),
            "updatedAt": now - timedelta(days=1, hours=2),
        },
    ]

    # ------------------------------------------------------------------
    # Demo activity log entries
    # ------------------------------------------------------------------
    activity_entries = [
        {
            "agent": "scheduler",
            "action": "Scheduled 'Interview prep' for today 5–7pm",
            "reasoning": "Interview is tomorrow 10am. 2-hour block ending by 7pm gives overnight review time. Found the slot by checking freebusy from now until deadline.",
            "taskId": "demo-task-interview",
            "createdAt": now - timedelta(hours=12),
        },
        {
            "agent": "prioritizer",
            "action": "Scored 'Interview prep' at 88/100",
            "reasoning": "Urgency: 8.5/10 (interview tomorrow). Importance: 9.2/10 (career-impact category). Interview outranks all current tasks at similar deadlines.",
            "taskId": "demo-task-interview",
            "createdAt": now - timedelta(hours=12, minutes=1),
        },
        {
            "agent": "intake",
            "action": "Detected task from email: 'Submit housing application'",
            "reasoning": "Email from housing@university.edu mentioned 'deadline October 15th'. Extracted: title=Submit housing application, deadline=Oct 15, estimatedMinutes=30, category=other. Waiting for your approval.",
            "taskId": "demo-task-inbox",
            "createdAt": now - timedelta(hours=2),
        },
        {
            "agent": "insights",
            "action": "Generated weekly recap",
            "reasoning": "Completed 4 tasks this week (80% on-time rate). Bills tend to be completed last-minute — may benefit from scheduling 2 days early next month.",
            "createdAt": now - timedelta(hours=48),
        },
    ]

    # Write tasks
    print(f"Seeding {len(tasks)} tasks for uid={uid}...")
    for task in tasks:
        task_id = task.pop("id")
        tasks_ref.document(task_id).set(task)
        print(f"  ✓ Task: {task['title'][:50]}")

    # Write activity log
    import uuid
    print(f"\nSeeding {len(activity_entries)} activity log entries...")
    for entry in activity_entries:
        log_id = str(uuid.uuid4())
        log_ref.document(log_id).set(entry)
        print(f"  ✓ Activity: {entry['action'][:60]}")

    # Update user profile to mark calendar as connected (for demo)
    db.collection("users").document(uid).set(
        {
            "googleCalendarConnected": True,
            "gmailConnected": True,
            "workHoursStart": 9,
            "workHoursEnd": 18,
            "timezone": "America/Chicago",
        },
        merge=True,
    )
    print(f"\n✓ User profile updated.")
    print(f"\nDemo data seeded successfully.")
    print(f"Note: 'Chemistry lab report' (demo-task-atrisk) has a deadline in ~2.5 hours")
    print(f"and a scheduled block AFTER the deadline — it will trigger the Monitor Agent.")


def main():
    parser = argparse.ArgumentParser(description="Seed demo data for Life Saver")
    parser.add_argument("--uid", required=True, help="Firebase user UID to seed data for")
    args = parser.parse_args()

    db = init_firebase()
    seed(args.uid, db)


if __name__ == "__main__":
    main()
