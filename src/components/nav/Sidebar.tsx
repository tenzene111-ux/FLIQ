"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Bell, Settings, LogOut, Radio } from "lucide-react";
import { NAV_ITEMS, GRADIENT_ID } from "./nav-items";
import { useAuthStore } from "@/store/auth";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { Avatar } from "@/components/ui/Avatar";
import { FliqLogo } from "@/components/ui/FliqLogo";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { notifications, messages } = useUnreadCounts();

  const isActive = (matches: readonly string[]) => matches.some((m) => pathname === m || pathname.startsWith(m + "/"));

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    toast("success", "Logged out");
    router.push("/welcome");
    router.refresh();
  }

  const items = [
    ...NAV_ITEMS.slice(0, 1),
    { href: "/activity", label: "Activity", icon: Bell, match: ["/activity"], badge: notifications },
    ...NAV_ITEMS.slice(1, 2),
    { href: "/live", label: "Live", icon: Radio, match: ["/live"] },
    ...NAV_ITEMS.slice(2),
  ];

  return (
    <aside className="hidden md:flex flex-col w-[240px] shrink-0 h-screen sticky top-0 border-r border-border px-3 py-5">
      <Link href="/home" className="px-3 mb-6">
        <FliqLogo />
      </Link>

      <nav className="flex flex-col gap-1" aria-label="Primary">
        {items.map((item) => {
          const active = isActive(item.match);
          const Icon = item.icon;
          const badge = "badge" in item ? item.badge : item.href === "/inbox" ? messages : undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-colors relative",
                active ? "text-white bg-white/5" : "text-muted hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={22} color={active ? `url(#${GRADIENT_ID})` : "currentColor"} strokeWidth={active ? 2.3 : 2} />
              {item.label}
              {!!badge && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-[10px] font-bold text-white flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}

        <Link
          href="/create"
          className="mt-3 flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gradient-brand-horizontal text-white font-semibold text-sm shadow-[0_4px_20px_-4px_rgba(217,70,239,0.5)] hover:brightness-110 transition-all"
        >
          <Plus size={18} strokeWidth={2.5} />
          Create
        </Link>
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-colors",
            pathname.startsWith("/settings") ? "text-white bg-white/5" : "text-muted hover:text-white hover:bg-white/5"
          )}
        >
          <Settings size={22} />
          Settings
        </Link>
        {user && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[15px] font-medium text-muted hover:text-danger hover:bg-danger/10 transition-colors text-left"
          >
            <LogOut size={22} />
            Log out
          </button>
        )}
        {user && (
          <Link
            href={`/profile/${user.username}`}
            className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Avatar src={user.avatarUrl} alt={user.displayName} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
              <p className="text-xs text-muted-2 truncate">@{user.username}</p>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
