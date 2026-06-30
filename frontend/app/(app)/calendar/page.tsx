/**
 * /calendar — shows AI-scheduled blocks alongside existing calendar events.
 * Phase 2: wire up Google Calendar display.
 */

"use client";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A3A]">Calendar</h1>
        <p className="text-[#6B7A8D] text-sm mt-1">
          Your week with Life Saver&apos;s scheduled blocks highlighted.
        </p>
      </div>

      <div className="card border border-dashed border-[#E2E8F0] text-center py-16">
        <span className="text-4xl" aria-hidden>📅</span>
        <p className="font-medium text-[#1E2A3A] mt-3">
          Calendar view coming in Phase 2.
        </p>
        <p className="text-[#6B7A8D] text-sm mt-1 max-w-sm mx-auto">
          Once your Google Calendar is connected, scheduled task blocks will
          appear here alongside your existing events.
        </p>
      </div>
    </div>
  );
}
