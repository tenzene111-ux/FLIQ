"use client";

import { useEffect, useState } from "react";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Switch } from "@/components/ui/Switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/store/toast";

interface Settings {
  pushLikes: boolean;
  pushComments: boolean;
  pushFollowers: boolean;
  pushMentions: boolean;
  pushMessages: boolean;
  emailNotifications: boolean;
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => {});
  }, []);

  async function update(patch: Partial<Settings>) {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);
    if (!res?.ok) toast("error", "Couldn't save that change");
  }

  if (!settings) {
    return (
      <SettingsSubpage title="Notifications">
        <div className="px-4 flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </SettingsSubpage>
    );
  }

  return (
    <SettingsSubpage title="Notifications">
      <div className="px-4 flex flex-col">
        <p className="text-xs font-semibold text-muted-2 uppercase tracking-wide py-2">Push notifications</p>
        <Row label="Likes" checked={settings.pushLikes} onChange={(v) => update({ pushLikes: v })} />
        <Row label="Comments" checked={settings.pushComments} onChange={(v) => update({ pushComments: v })} />
        <Row label="New followers" checked={settings.pushFollowers} onChange={(v) => update({ pushFollowers: v })} />
        <Row label="Mentions" checked={settings.pushMentions} onChange={(v) => update({ pushMentions: v })} />
        <Row label="Messages" checked={settings.pushMessages} onChange={(v) => update({ pushMessages: v })} />
        <p className="text-xs font-semibold text-muted-2 uppercase tracking-wide py-2 mt-2">Email</p>
        <Row label="Email notifications" checked={settings.emailNotifications} onChange={(v) => update({ emailNotifications: v })} />
      </div>
    </SettingsSubpage>
  );
}

function Row({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border">
      <span className="text-white text-sm">{label}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
