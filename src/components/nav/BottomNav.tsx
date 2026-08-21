"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { NAV_ITEMS, GRADIENT_ID } from "./nav-items";
import { useAuthStore } from "@/store/auth";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { messages } = useUnreadCounts();

  const isActive = (matches: readonly string[]) => matches.some((m) => pathname === m || pathname.startsWith(m + "/"));

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-border safe-bottom"
    >
      <div className="flex items-center justify-between px-2 h-16 max-w-lg mx-auto relative">
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.match)} badge={item.href === "/inbox" ? 0 : undefined} />
        ))}

        <Link
          href="/create"
          aria-label="Create"
          className="flex items-center justify-center w-14 h-11 rounded-2xl bg-gradient-brand-horizontal shadow-[0_4px_20px_-2px_rgba(217,70,239,0.6)] active:scale-95 transition-transform tap-highlight-none"
        >
          <Plus size={26} className="text-white" strokeWidth={2.5} />
        </Link>

        {NAV_ITEMS.slice(2).map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.match)}
            badge={item.href === "/inbox" ? messages : item.href === "/profile" ? undefined : undefined}
            avatarSrc={item.href === "/profile" ? user?.avatarUrl : undefined}
            avatarAlt={item.href === "/profile" ? user?.displayName : undefined}
          />
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  item,
  active,
  badge,
  avatarSrc,
  avatarAlt,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  badge?: number;
  avatarSrc?: string | null;
  avatarAlt?: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className="flex flex-col items-center justify-center gap-1 w-14 h-full tap-highlight-none group"
    >
      <span className="relative">
        {avatarAlt ? (
          <Avatar src={avatarSrc} alt={avatarAlt} size="xs" ring={active} className={cn(!active && "opacity-70 grayscale")} />
        ) : (
          <Icon size={24} color={active ? `url(#${GRADIENT_ID})` : "#8b8b96"} strokeWidth={active ? 2.3 : 2} />
        )}
        {!!badge && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-danger text-[10px] font-bold text-white flex items-center justify-center">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className={cn("text-[10px] font-medium", active ? "text-white" : "text-muted-2")}>{item.label}</span>
    </Link>
  );
}
