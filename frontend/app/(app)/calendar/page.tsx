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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

function formatHour(h: number) {
  return h === 12 ? "12pm" : h > 12 ? `${h-12}pm` : `${h}am`;
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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function eventStyle(event: CalEvent) {
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
    } catch {
      setError("Couldn't load calendar events. Make sure Google Calendar is connected in Settings.");
    } finally {
      setLoading(false);
    }
  }

  const monthLabel = weekDays[0].toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-[#555] text-sm mt-0.5">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate()-7); setWeekBase(d); }} className="btn-secondary text-xs px-2.5 py-1.5">← Prev</button>
          <button onClick={() => setWeekBase(new Date())} className="btn-secondary text-xs px-2.5 py-1.5">Today</button>
          <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate()+7); setWeekBase(d); }} className="btn-secondary text-xs px-2.5 py-1.5">Next →</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-[#444]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#14b8a6]" />Life Saver task</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" />At risk</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#333]" />Other event</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="border border-dashed border-[#2a2a2a] rounded-xl text-center py-10">
          <p className="text-[#555] text-sm">{error}</p>
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid border-b border-[#2a2a2a]" style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}>
            <div className="border-r border-[#2a2a2a]" />
            {weekDays.map((day) => {
              const isToday = sameDay(day, today);
              return (
                <div key={day.toISOString()} className={clsx("text-center py-3 border-r border-[#2a2a2a] last:border-r-0", isToday && "bg-[#2563eb]/5")}>
                  <p className={clsx("text-[10px] font-medium uppercase tracking-wider", isToday ? "text-[#2563eb]" : "text-[#444]")}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={clsx("text-base font-bold mt-0.5", isToday ? "text-[#2563eb]" : "text-[#888]")}>
                    {day.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="overflow-y-auto max-h-[560px]">
            <div className="grid" style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}>
              <div className="border-r border-[#2a2a2a]">
                {HOURS.map(h => (
                  <div key={h} className="h-14 flex items-start pt-1 pr-2 justify-end">
                    <span className="text-[10px] text-[#333]">{formatHour(h)}</span>
                  </div>
                ))}
              </div>
              {weekDays.map((day) => {
                const isToday = sameDay(day, today);
                const dayEvents = events.filter(e => { try { return sameDay(new Date(e.start), day); } catch { return false; } });
                return (
                  <div key={day.toISOString()}
                    className={clsx("border-r border-[#2a2a2a] last:border-r-0 relative", isToday && "bg-[#2563eb]/[0.02]")}
                    style={{ height: `${HOURS.length * 56}px` }}>
                    {HOURS.map(h => (
                      <div key={h} className="absolute w-full border-t border-[#1f1f1f]"
                        style={{ top: `${((h-7)/HOURS.length)*100}%` }} />
                    ))}
                    {dayEvents.map((event) => {
                      const style = eventStyle(event);
                      const isTask = event.type === "task";
                      const bg = isTask ? (event.status === "at_risk" ? "#451a03" : "#0d2d26") : "#1a1a1a";
                      const border = isTask ? (event.status === "at_risk" ? "#f59e0b" : "#14b8a6") : "#333";
                      return (
                        <button key={event.id}
                          onClick={() => setSelected(selected?.id === event.id ? null : event)}
                          className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-left overflow-hidden text-[10px] font-medium z-10 transition-opacity hover:opacity-80"
                          style={{ ...style, backgroundColor: bg, border: `1px solid ${border}`, color: isTask ? (event.status === "at_risk" ? "#fb923c" : "#34d399") : "#888" }}
                          aria-label={event.title}>
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

      {/* Event detail */}
      {selected && (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-[#e5e5e5] text-sm">{selected.title}</p>
              <p className="text-xs text-[#555] mt-1">
                {new Date(selected.start).toLocaleString("en-US", { weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}
                {" → "}{new Date(selected.end).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" })}
              </p>
              {selected.type === "task" && selected.status && (
                <p className="text-xs text-[#444] mt-1">
                  Status: <span className="font-medium capitalize text-[#888]">{selected.status}</span>
                  {selected.priorityScore != null && ` · Priority: ${selected.priorityScore}/100`}
                </p>
              )}
            </div>
            <button onClick={() => setSelected(null)} className="text-[#444] hover:text-[#888] text-lg leading-none ml-4">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
