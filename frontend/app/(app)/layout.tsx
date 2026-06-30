/**
 * Authenticated app shell layout — nav sidebar + main content.
 * Wraps dashboard, tasks, calendar, insights, activity, settings.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Today", icon: "⚡" },
  { href: "/tasks", label: "Tasks", icon: "✓" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/insights", label: "Insights", icon: "💡" },
  { href: "/activity", label: "Activity", icon: "👁" },
  { href: "/settings", label: "Settings", icon: "⚙" },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex">
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex flex-col w-56 bg-[#1E2A3A] min-h-screen px-3 py-6 fixed left-0 top-0"
      >
        {/* Wordmark */}
        <Link href="/dashboard" className="flex items-center gap-2 px-3 mb-8">
          <span className="w-7 h-7 rounded-lg bg-[#2D7DD2] flex items-center justify-center text-white text-sm" aria-hidden>⚡</span>
          <span className="text-white font-semibold text-sm leading-tight">
            Life Saver
          </span>
        </Link>

        {/* Nav links */}
        <ul className="space-y-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-[#2D7DD2] text-white"
                      : "text-[#94A3B8] hover:bg-white/10 hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="text-base" aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 bg-[#1E2A3A] border-t border-white/10 z-50"
      >
        <ul className="flex justify-around">
          {NAV_ITEMS.filter(i => i.href !== "/settings").map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex flex-col items-center gap-0.5 px-3 py-3 text-xs font-medium transition-colors",
                    active ? "text-[#2D7DD2]" : "text-[#94A3B8]"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="text-xl" aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-56 px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 max-w-4xl">
        {children}
      </main>
    </div>
  );
}
