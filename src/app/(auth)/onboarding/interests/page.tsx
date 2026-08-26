"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FliqLogo } from "@/components/ui/FliqLogo";
import { Button } from "@/components/ui/Button";
import { CATEGORIES } from "@/lib/constants";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export default function OnboardingInterestsPage() {
  const router = useRouter();
  const patchUser = useAuthStore((s) => s.patchUser);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggle(slug: string) {
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
  }

  async function handleContinue() {
    setLoading(true);
    try {
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: selected }),
      });
      patchUser({ interests: JSON.stringify(selected) });
      router.push("/onboarding/creators");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md flex flex-col flex-1">
        <div className="flex justify-center mb-6">
          <FliqLogo />
        </div>

        <div className="flex items-center gap-1.5 mb-6 justify-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("h-1.5 rounded-full transition-all", i === 0 ? "w-8 bg-gradient-brand-horizontal" : "w-4 bg-surface-3")} />
          ))}
        </div>

        <h1 className="text-2xl font-bold text-white text-center">What are you into?</h1>
        <p className="text-muted text-sm text-center mt-1.5">Pick a few topics to personalize your For You feed.</p>

        <div className="grid grid-cols-2 gap-3 mt-8">
          {CATEGORIES.map((c) => {
            const active = selected.includes(c.slug);
            return (
              <button
                key={c.slug}
                onClick={() => toggle(c.slug)}
                type="button"
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-3.5 rounded-xl border text-left transition-all relative",
                  active ? "border-transparent bg-gradient-brand-soft ring-1 ring-fliq-magenta/50" : "border-border bg-surface-2 hover:bg-surface-3"
                )}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${c.color}22`, color: c.color }}
                >
                  <c.icon size={16} />
                </span>
                <span className="text-white text-sm font-medium">{c.label}</span>
                {active && <Check size={16} className="text-fliq-cyan ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-8 flex flex-col gap-3">
          <p className="text-center text-xs text-muted-2">{selected.length} selected {selected.length < 3 && "· pick at least 3"}</p>
          <Button size="lg" fullWidth loading={loading} disabled={selected.length < 3} onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
