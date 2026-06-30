"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Today", icon: <TodayIcon /> },
  { href: "/tasks", label: "Tasks", icon: <TasksIcon /> },
  { href: "/calendar", label: "Calendar", icon: <CalendarIcon /> },
  { href: "/insights", label: "Insights", icon: <InsightsIcon /> },
  { href: "/activity", label: "Activity", icon: <ActivityIcon /> },
  { href: "/settings", label: "Settings", icon: <SettingsIcon /> },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC]">
        <div className="w-6 h-6 border-2 border-[#2D7DD2] border-t-transparent rounded-full animate-spin" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex">
      {/* Sidebar — desktop */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex flex-col w-60 bg-[#1E2A3A] min-h-screen px-4 py-6 fixed left-0 top-0 z-40 shadow-xl"
      >
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 px-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2D7DD2] to-[#38B2AC] flex items-center justify-center shadow-md flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Life Saver</p>
            <p className="text-[#64748B] text-[10px] mt-0.5">AI Productivity</p>
          </div>
        </Link>

        <ul className="space-y-1 flex-1" role="list">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
                    active
                      ? "bg-[#2D7DD2] text-white shadow-sm"
                      : "text-[#94A3B8] hover:bg-white/8 hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={clsx("w-4 h-4 flex-shrink-0", active ? "text-white" : "text-[#64748B]")} aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User at bottom */}
        <div className="px-2 pt-4 border-t border-white/10 mt-4">
          <div className="flex items-center gap-2.5">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-white/10" aria-hidden />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#2D7DD2] flex items-center justify-center text-white text-xs font-bold">
                {user.displayName?.[0] ?? user.email?.[0] ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.displayName ?? user.email}</p>
              <p className="text-[#64748B] text-[10px] truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 bg-[#1E2A3A] border-t border-white/10 z-50"
      >
        <ul className="flex justify-around" role="list">
          {NAV_ITEMS.filter((i) => i.href !== "/settings").map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex flex-col items-center gap-1 px-3 py-3 text-[10px] font-medium transition-colors",
                    active ? "text-[#2D7DD2]" : "text-[#64748B]"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="w-5 h-5" aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-60 px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 w-full">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

// Nav icons — clean SVG, consistent 16x16 viewBox
function TodayIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
}
function TasksIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
}
function CalendarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function InsightsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function ActivityIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
function SettingsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
