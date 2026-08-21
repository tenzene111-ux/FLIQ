"use client";

import { useEffect, useState } from "react";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Switch } from "@/components/ui/Switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";

interface Settings {
  privateAccount: boolean;
  allowComments: boolean;
  allowDuet: boolean;
  allowDownloads: boolean;
  allowMessagesFrom: "everyone" | "followers" | "none";
  showActivityStatus: boolean;
}

export default function PrivacySettingsPage() {
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
      <SettingsSubpage title="Privacy">
        <div className="px-4 flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </SettingsSubpage>
    );
  }

  return (
    <SettingsSubpage title="Privacy">
      <div className="px-4 flex flex-col">
        <Row label="Private account" description="Only approved followers can see your videos" checked={settings.privateAccount} onChange={(v) => update({ privateAccount: v })} />
        <Row label="Allow comments on my videos" checked={settings.allowComments} onChange={(v) => update({ allowComments: v })} />
        <Row label="Allow duet & repost" checked={settings.allowDuet} onChange={(v) => update({ allowDuet: v })} />
        <Row label="Allow video downloads" checked={settings.allowDownloads} onChange={(v) => update({ allowDownloads: v })} />
        <Row label="Show activity status" description="Let others see when you're online" checked={settings.showActivityStatus} onChange={(v) => update({ showActivityStatus: v })} />

        <div className="py-4">
          <p className="text-white text-sm mb-2">Who can message you</p>
          <div className="flex gap-2">
            {(["everyone", "followers", "none"] as const).map((v) => (
              <button
                key={v}
                onClick={() => update({ allowMessagesFrom: v })}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold border capitalize",
                  settings.allowMessagesFrom === v ? "bg-white text-black border-white" : "border-border text-white"
                )}
              >
                {v === "none" ? "No one" : v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SettingsSubpage>
  );
}

function Row({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border">
      <div className="pr-4">
        <p className="text-white text-sm">{label}</p>
        {description && <p className="text-muted-2 text-xs mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
