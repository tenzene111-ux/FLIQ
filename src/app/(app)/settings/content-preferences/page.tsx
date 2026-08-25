"use client";

import { useEffect, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  const [keywordFilters, setKeywordFilters] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
      .then((d) => {
        setReducedMotion(d.settings.reducedMotion);
        try {
          setKeywordFilters(JSON.parse(d.settings.keywordFilters || "[]"));
        } catch {
          setKeywordFilters([]);
        }
      })
      .catch(() => {});
  }, [user]);

  async function addKeyword() {
    const kw = newKeyword.trim().replace(/^#/, "");
    if (!kw || keywordFilters.includes(kw)) {
      setNewKeyword("");
      return;
    }
    const next = [...keywordFilters, kw];
    setKeywordFilters(next);
    setNewKeyword("");
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywordFilters: next }),
    }).catch(() => {});
  }

  async function removeKeyword(kw: string) {
    const next = keywordFilters.filter((k) => k !== kw);
    setKeywordFilters(next);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywordFilters: next }),
    }).catch(() => {});
  }

  async function refreshFeed() {
    if (!window.confirm("Refresh your For You feed? This clears anything you've marked \"Not Interested\" on, so recommendations start rebuilding from your likes and follows again.")) return;
    setRefreshing(true);
    try {
      await fetch("/api/feed/refresh", { method: "POST" });
      toast("success", "For You feed refreshed");
    } finally {
      setRefreshing(false);
    }
  }

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

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-white text-sm font-semibold mb-1">Keyword filters</p>
          <p className="text-muted-2 text-xs mb-3">Posts with these words or hashtags won&apos;t be recommended to you.</p>
          <div className="flex gap-2">
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="Add a word or #hashtag"
              className="flex-1"
            />
            <Button variant="secondary" onClick={addKeyword} disabled={!newKeyword.trim()}>
              Add
            </Button>
          </div>
          {keywordFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {keywordFilters.map((kw) => (
                <span key={kw} className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-full pl-3 pr-1.5 py-1 text-xs text-white">
                  {kw}
                  <button onClick={() => removeKeyword(kw)} aria-label={`Remove ${kw}`} className="text-muted-2 hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-border pb-4">
          <p className="text-white text-sm font-semibold mb-1">Refresh For You feed</p>
          <p className="text-muted-2 text-xs mb-3">
            Clears posts/creators you&apos;ve marked &quot;Not Interested&quot; on. Your likes, follows, and posts are never affected.
          </p>
          <Button variant="secondary" onClick={refreshFeed} loading={refreshing}>
            <RotateCcw size={15} /> Refresh For You
          </Button>
        </div>
      </div>
    </SettingsSubpage>
  );
}
