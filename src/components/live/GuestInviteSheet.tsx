"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";
import { toast } from "@/store/toast";

interface Candidate {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

export function GuestInviteSheet({ open, onClose, liveId, invitedUsernames }: { open: boolean; onClose: () => void; liveId: string; invitedUsernames: Set<string> }) {
  const [users, setUsers] = useState<Candidate[] | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUsers(null);
    fetch("/api/users/me/following")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => setUsers([]));
  }, [open]);

  async function invite(username: string) {
    setSending(username);
    const res = await fetch(`/api/live/${liveId}/guests/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSending(null);
    if (res?.ok) toast("success", `Invite sent to @${username}`);
    else toast("error", data?.error || "Couldn't send invite");
  }

  return (
    <Sheet open={open} onClose={onClose} title="Invite a guest" heightClass="h-[70vh]">
      {users === null ? (
        <div className="px-4 text-muted-2 text-sm">Loading...</div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Follow people to invite them" description="You can invite anyone you follow to co-host." />
      ) : (
        users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar src={u.avatarUrl} alt={u.displayName} size="md" verified={u.isVerified} />
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate">{u.displayName}</p>
              <p className="text-muted-2 text-xs truncate">@{u.username}</p>
            </div>
            <Button size="sm" variant={invitedUsernames.has(u.username) ? "secondary" : "primary"} loading={sending === u.username} onClick={() => invite(u.username)}>
              {invitedUsernames.has(u.username) ? "Invited" : "Invite"}
            </Button>
          </div>
        ))
      )}
    </Sheet>
  );
}
