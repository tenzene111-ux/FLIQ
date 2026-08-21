"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Video, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/videos", label: "Videos", icon: Video },
  { href: "/admin/reports", label: "Reports", icon: Flag },
];

export function AdminNav({ horizontal }: { horizontal?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn(horizontal ? "flex items-center gap-1 px-2 py-2 overflow-x-auto no-scrollbar" : "flex flex-col gap-1")}>
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-xl text-sm font-medium shrink-0",
              horizontal ? "px-3 py-1.5" : "px-3 py-2.5",
              active ? "text-white bg-white/5" : "text-muted hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon size={17} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
