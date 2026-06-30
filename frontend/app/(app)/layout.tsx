"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useAuth } from "@/lib/auth-context";

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
  const router = useRouter();
  const { user, loading } = useAuth();

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Show spinner while auth state resolves
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
        className="hidden md:flex flex-col w-56 bg-[#1E2A3A] min-h-screen px-3 py-6 fixed left-0 top-0 z-40"
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 mb-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded-lg"
        >
          <span className="w-7 h-7 rounded-lg bg-[#2D7DD2] flex items-center justify-center text-white text-sm" aria-hidden>⚡</span>
          <span className="text-white font-semibold text-sm leading-tight">Life Saver</span>
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
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
                    active
                      ? "bg-[#2D7DD2] text-white"
                      : "text-[#94A3B8] hover:bg-white/10 hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="text-base w-5 text-center" aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User avatar at bottom */}
        <div className="px-3 pt-4 border-t border-white/10 mt-4">
          <div className="flex items-center gap-2">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" aria-hidden />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#2D7DD2] flex items-center justify-center text-white text-xs font-bold">
                {user.displayName?.[0] ?? user.email?.[0] ?? "?"}
              </div>
            )}
            <span className="text-[#94A3B8] text-xs truncate max-w-[120px]">
              {user.displayName ?? user.email}
            </span>
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
                    "flex flex-col items-center gap-0.5 px-3 py-3 text-xs font-medium transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
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
      <main className="flex-1 md:ml-56 px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 w-full">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
