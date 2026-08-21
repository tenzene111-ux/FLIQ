"use client";

import Link from "next/link";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { BarChart3, Wallet, Banknote, Megaphone, ChevronRight } from "lucide-react";

const TOOLS = [
  { icon: BarChart3, label: "Analytics", href: "/analytics", desc: "Views, engagement, audience insights" },
  { icon: Wallet, label: "Monetization", href: "/settings/monetization", desc: "Ways to earn on Fliq" },
  { icon: Banknote, label: "Payouts", href: "/settings/payouts", desc: "Manage your earnings" },
  { icon: Megaphone, label: "Promote Video", href: "/settings/promote", desc: "Boost your reach" },
];

export default function CreatorToolsPage() {
  return (
    <SettingsSubpage title="Creator Tools">
      <div className="px-4 flex flex-col">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="flex items-center gap-3.5 py-3.5 border-b border-border">
            <span className="w-10 h-10 rounded-xl bg-gradient-brand-soft flex items-center justify-center shrink-0">
              <t.icon size={18} className="text-fliq-cyan" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">{t.label}</p>
              <p className="text-muted-2 text-xs">{t.desc}</p>
            </div>
            <ChevronRight size={16} className="text-muted-2" />
          </Link>
        ))}
      </div>
    </SettingsSubpage>
  );
}
