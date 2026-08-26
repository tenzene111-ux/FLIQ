"use client";

import { useEffect, useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import type { UserBrief } from "@/types/models";

export type ShareKind = "video" | "profile" | "hashtag" | "sound" | "live";

/** Multi-select "send to" sheet shared by every share entry point (video, profile, hashtag, sound, LIVE). */
export function SendToSheet({ open, onClose, kind, id, title = "Send to" }: { open: boolean; onClose: () => void; kind: ShareKind; id: string; title?: string }) {
  const [users, setUsers] = useState<UserBrief[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    fetch("/api/users/me/following")
      .then((r) => r.json())
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]));
  }, [open]);

  function toggle(username: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }

  async function send() {
    if (selected.size === 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, toUsernames: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't send");
      toast("success", `Sent to ${data.sentCount} ${data.sentCount === 1 ? "person" : "people"}`);
      onClose();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Couldn't send");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="pb-3">
        {users === null && <p className="text-center text-muted text-sm py-6">Loading...</p>}
        {users?.length === 0 && (
          <EmptyState icon={MessageCircle} title="Follow people to send" description="You can send to people you follow." className="py-8" />
        )}
        {users?.map((u) => {
          const active = selected.has(u.username);
          return (
            <button key={u.id} onClick={() => toggle(u.username)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left">
              <Avatar src={u.avatarUrl} alt={u.displayName} size="md" verified={u.isVerified} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{u.displayName}</p>
                <p className="text-muted-2 text-xs truncate">@{u.username}</p>
              </div>
              <span
                className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                  active ? "bg-fliq-magenta border-fliq-magenta" : "border-border"
                )}
              >
                {active && <Check size={12} className="text-white" />}
              </span>
            </button>
          );
        })}
      </div>
      {!!users?.length && (
        <div className="px-4 pb-4">
          <Button fullWidth disabled={selected.size === 0} loading={sending} onClick={send}>
            Send{selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
