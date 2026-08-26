"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Shield, Mic, MicOff, UserX } from "lucide-react";
import { toast } from "@/store/toast";

interface PersonBrief {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

interface Guest {
  userId: string;
  mutedByHost: boolean;
  user: PersonBrief;
}

export function ModerationSheet({
  open,
  onClose,
  liveId,
  guests,
  onGuestsChange,
}: {
  open: boolean;
  onClose: () => void;
  liveId: string;
  guests: Guest[];
  onGuestsChange: (guests: Guest[]) => void;
}) {
  const [moderators, setModerators] = useState<{ userId: string; user: PersonBrief }[] | null>(null);
  const [username, setUsername] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/live/${liveId}/moderators`)
      .then((r) => r.json())
      .then((d) => setModerators(d.moderators || []))
      .catch(() => setModerators([]));
  }, [open, liveId]);

  async function assignModerator() {
    const uname = username.trim().replace(/^@/, "");
    if (!uname) return;
    setAssigning(true);
    const res = await fetch(`/api/live/${liveId}/moderators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: uname }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setAssigning(false);
    if (res?.ok && data?.moderator) {
      setModerators((prev) => [...(prev ?? []), data.moderator]);
      setUsername("");
    } else {
      toast("error", data?.error || "Couldn't assign moderator");
    }
  }

  async function removeModerator(uname: string) {
    setModerators((prev) => prev?.filter((m) => m.user.username !== uname) ?? null);
    await fetch(`/api/live/${liveId}/moderators/${uname}`, { method: "DELETE" }).catch(() => {});
  }

  async function toggleMuteGuest(guest: Guest) {
    const next = !guest.mutedByHost;
    onGuestsChange(guests.map((g) => (g.userId === guest.userId ? { ...g, mutedByHost: next } : g)));
    await fetch(`/api/live/${liveId}/guests/${guest.user.username}/mute`, { method: next ? "POST" : "DELETE" }).catch(() => {});
  }

  async function removeGuest(guest: Guest) {
    onGuestsChange(guests.filter((g) => g.userId !== guest.userId));
    await fetch(`/api/live/${liveId}/guests/${guest.user.username}`, { method: "DELETE" }).catch(() => {});
    toast("success", `Removed @${guest.user.username}`);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Moderation" heightClass="h-[75vh]">
      {guests.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-muted text-xs font-semibold uppercase tracking-wide mb-2">Guests</p>
          <div className="flex flex-col gap-1">
            {guests.map((g) => (
              <div key={g.userId} className="flex items-center gap-3 py-2">
                <Avatar src={g.user.avatarUrl} alt={g.user.displayName} size="sm" />
                <span className="flex-1 min-w-0 text-white text-sm truncate">@{g.user.username}</span>
                <button onClick={() => toggleMuteGuest(g)} aria-label={g.mutedByHost ? "Unmute guest" : "Mute guest"} className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-white">
                  {g.mutedByHost ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
                <button onClick={() => removeGuest(g)} aria-label="Remove guest" className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-danger">
                  <UserX size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        <p className="text-muted text-xs font-semibold uppercase tracking-wide mb-2">Moderators</p>
        <div className="flex gap-2 mb-3">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" onKeyDown={(e) => e.key === "Enter" && assignModerator()} />
          <Button size="sm" onClick={assignModerator} loading={assigning} disabled={!username.trim()}>
            Add
          </Button>
        </div>
        {moderators === null ? (
          <p className="text-muted-2 text-xs">Loading...</p>
        ) : moderators.length === 0 ? (
          <p className="text-muted-2 text-xs">No moderators yet. Trusted moderators can delete comments, mute chatters, and pin messages.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {moderators.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 py-2">
                <Avatar src={m.user.avatarUrl} alt={m.user.displayName} size="sm" />
                <span className="flex-1 min-w-0 text-white text-sm truncate flex items-center gap-1.5">
                  <Shield size={12} className="text-fliq-cyan" /> @{m.user.username}
                </span>
                <Button size="sm" variant="secondary" onClick={() => removeModerator(m.user.username)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
