"use client";

import { useEffect, useState } from "react";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { CATEGORIES } from "@/lib/constants";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";

export default function ContentPreferencesPage() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const [interests, setInterests] = useState<string[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      try {
        setInterests(JSON.parse(user.interests || "[]"));
      } catch {
        setInterests([]);
      }
    }
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setReducedMotion(d.settings.reducedMotion))
      .catch(() => {});
  }, [user]);

  function toggle(slug: string) {
    setInterests((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests }),
      });
      patchUser({ interests: JSON.stringify(interests) });
      toast("success", "Preferences updated");
    } finally {
      setSaving(false);
    }
  }

  async function toggleReducedMotion(v: boolean) {
    setReducedMotion(v);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reducedMotion: v }),
    }).catch(() => {});
  }

  return (
    <SettingsSubpage title="Content Preferences">
      <div className="px-4">
        <div className="flex items-center justify-between py-3 border-b border-border mb-4">
          <div>
            <p className="text-white text-sm">Reduce motion</p>
            <p className="text-muted-2 text-xs mt-0.5">Minimize animations across Fliq</p>
          </div>
          <Switch checked={reducedMotion} onChange={toggleReducedMotion} label="Reduce motion" />
        </div>

        <p className="text-white text-sm font-semibold mb-3">Interests</p>
        <div className="grid grid-cols-2 gap-2.5">
          {CATEGORIES.map((c) => {
            const active = interests.includes(c.slug);
            return (
              <button
                key={c.slug}
                onClick={() => toggle(c.slug)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm",
                  active ? "border-transparent bg-gradient-brand-soft text-white ring-1 ring-fliq-magenta/50" : "border-border text-white/80"
                )}
              >
                <span>{c.emoji}</span>
                {c.label}
              </button>
            );
          })}
        </div>
        <Button fullWidth className="mt-5" onClick={save} loading={saving}>
          Save preferences
        </Button>
      </div>
    </SettingsSubpage>
  );
}
