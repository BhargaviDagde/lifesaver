"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { clsx } from "clsx";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "task" | "calendar";
  status?: string;
  color: string;
  category?: string;
  priorityScore?: number;
}

const CATEGORY_EMOJI: Record<string, string> = {
  assignment: "📝", bill: "💳", interview: "🎯", meeting: "👥", other: "📌",
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm

function formatHour(h: number) {
  return h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`;
}

function getWeekDays(base: Date): Date[] {
  const days = [];
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function eventStyle(event: CalEvent, dayStart: Date) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const dayStartHour = 7;
  const totalHours = 14;

  const startMinutes = (start.getHours() - dayStartHour) * 60 + start.getMinutes();
  const endMinutes = (end.getHours() - dayStartHour) * 60 + end.getMinutes();
  const duration = Math.max(endMinutes - startMinutes, 30);

  const top = (startMinutes / (totalHours * 60)) * 100;
  const height = (duration / (totalHours * 60)) * 100;

  return { top: `${top}%`, height: `${Math.max(height, 3)}%` };
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekBase, setWeekBase] = useState(new Date());
  const [selected, setSelected] = useState<CalEvent | null>(null);

  const weekDays = getWeekDays(weekBase);
  const today = new Date();

  useEffect(() => {
    if (!user) return;
    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weekBase]);

  async function fetchEvents() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/calendar/events?days=14`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (e) {
      setError("Couldn't load calendar events. Make sure Google Calendar is connected in Settings.");
    } finally {
      setLoading(false);
    }
  }

  function prevWeek() {
    const d = new Date(weekBase);
    d.setDate(d.getDate() - 7);
    setWeekBase(d);
  }

  function nextWeek() {
    const d = new Date(weekBase);
    d.setDate(d.getDate() + 7);
    setWeekBase(d);
  }

  function eventsForDay(day: Date) {
    return events.filter(e => {
      try { return sameDay(new Date(e.start), day); } catch { return false; }
    });
  }

  const monthLabel = weekDays[0].toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2A3A]">Calendar</h1>
          <p className="text-[#6B7A8D] text-sm mt-0.5">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="btn-secondary px-2.5 py-1.5 text-xs">← Prev</button>
          <button onClick={() => setWeekBase(new Date())} className="btn-secondary px-2.5 py-1.5 text-xs">Today</button>
          <button onClick={nextWeek} className="btn-secondary px-2.5 py-1.5 text-xs">Next →</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[#6B7A8D]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#38B2AC]" />Life Saver task
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#F6AE2D]" />At risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#6B7A8D]/40" />Other calendar event
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#2D7DD2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="card border border-dashed border-[#E2E8F0] text-center py-10">
          <p className="text-[#6B7A8D] text-sm">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8EDF3] shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid border-b border-[#E8EDF3]" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
            <div className="border-r border-[#E8EDF3]" />
            {weekDays.map((day) => {
              const isToday = sameDay(day, today);
              return (
                <div key={day.toISOString()} className={clsx(
                  "text-center py-2.5 border-r border-[#E8EDF3] last:border-r-0",
                  isToday && "bg-[#2D7DD2]/5"
                )}>
                  <p className={clsx("text-[11px] font-medium uppercase tracking-wide",
                    isToday ? "text-[#2D7DD2]" : "text-[#6B7A8D]"
                  )}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={clsx("text-lg font-bold mt-0.5",
                    isToday ? "text-[#2D7DD2]" : "text-[#1E2A3A]"
                  )}>
                    {day.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="overflow-y-auto max-h-[600px]">
            <div className="grid relative" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
              {/* Hour labels */}
              <div className="border-r border-[#E8EDF3]">
                {HOURS.map(h => (
                  <div key={h} className="h-14 flex items-start pt-1 pr-2 justify-end">
                    <span className="text-[10px] text-[#94A3B8]">{formatHour(h)}</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day) => {
                const isToday = sameDay(day, today);
                const dayEvents = eventsForDay(day);
                return (
                  <div key={day.toISOString()} className={clsx(
                    "border-r border-[#E8EDF3] last:border-r-0 relative",
                    isToday && "bg-[#2D7DD2]/[0.02]"
                  )} style={{ height: `${HOURS.length * 56}px` }}>
                    {/* Hour lines */}
                    {HOURS.map(h => (
                      <div key={h} className="absolute w-full border-t border-[#F1F5F9]"
                        style={{ top: `${((h - 7) / HOURS.length) * 100}%` }} />
                    ))}

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const style = eventStyle(event, day);
                      const isTask = event.type === "task";
                      return (
                        <button
                          key={event.id}
                          onClick={() => setSelected(selected?.id === event.id ? null : event)}
                          className={clsx(
                            "absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-left overflow-hidden",
                            "text-white text-[10px] font-medium cursor-pointer hover:opacity-90 transition-opacity",
                            "shadow-sm border border-white/20"
                          )}
                          style={{
                            ...style,
                            backgroundColor: event.color,
                            zIndex: 10,
                          }}
                          aria-label={event.title}
                        >
                          <span className="truncate block leading-tight">
                            {isTask && event.category ? CATEGORY_EMOJI[event.category] + " " : ""}
                            {event.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Event detail popover */}
      {selected && (
        <div className="card border border-[#E8EDF3] animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: selected.color }} />
                <p className="font-semibold text-[#1E2A3A]">{selected.title}</p>
              </div>
              <p className="text-xs text-[#6B7A8D]">
                {new Date(selected.start).toLocaleString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                  hour: "numeric", minute: "2-digit"
                })}
                {" → "}
                {new Date(selected.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
              {selected.type === "task" && selected.status && (
                <p className="text-xs text-[#6B7A8D] mt-1">
                  Status: <span className="font-medium capitalize">{selected.status}</span>
                  {selected.priorityScore != null && ` · Priority: ${selected.priorityScore}/100`}
                </p>
              )}
            </div>
            <button onClick={() => setSelected(null)} className="text-[#6B7A8D] hover:text-[#1E2A3A] text-lg leading-none">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
