"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "@/store/toast";
import { Link2, Send, Share2, MessageCircle } from "lucide-react";
import type { UserBrief } from "@/types/models";
import { EmptyState } from "@/components/ui/EmptyState";

export function ShareSheet({
  videoId,
  open,
  onClose,
  onShared,
}: {
  videoId: string;
  open: boolean;
  onClose: () => void;
  onShared?: () => void;
}) {
  const [following, setFollowing] = useState<UserBrief[] | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    fetch("/api/users/me/following")
      .then((r) => r.json())
      .then((d) => setFollowing(d.users))
      .catch(() => setFollowing([]));
  }, [open]);

  async function record(target: "link" | "fliq_user" | "external", toUsername?: string) {
    await fetch(`/api/videos/${videoId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, toUsername }),
    }).catch(() => {});
    onShared?.();
  }

  async function copyLink() {
    const url = `${window.location.origin}/video/${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("success", "Link copied to clipboard");
    } catch {
      toast("info", url);
    }
    record("link");
    onClose();
  }

  async function shareExternal() {
    const url = `${window.location.origin}/video/${videoId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: "Check this out on Fliq" });
        record("external");
      } catch {
        // user cancelled the native share sheet — not an error
      }
    } else {
      copyLink();
      return;
    }
    onClose();
  }

  async function sendTo(u: UserBrief) {
    await record("fliq_user", u.username);
    setSentTo((prev) => new Set(prev).add(u.id));
    toast("success", `Sent to @${u.username}`);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Share">
      <div className="px-4 pb-3 flex gap-4 overflow-x-auto no-scrollbar">
        <ShareAction icon={Link2} label="Copy link" onClick={copyLink} />
        <ShareAction icon={Share2} label="Share to..." onClick={shareExternal} />
      </div>

      <div className="px-4 pt-1 pb-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Send to</p>
      </div>
      <div className="pb-4">
        {following === null && <div className="px-4 text-sm text-muted-2">Loading...</div>}
        {following?.length === 0 && (
          <EmptyState icon={MessageCircle} title="Follow people to send" description="Videos you send go straight to their inbox." className="py-8" />
        )}
        {following?.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar src={u.avatarUrl} alt={u.displayName} size="md" verified={u.isVerified} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{u.displayName}</p>
              <p className="text-muted-2 text-xs truncate">@{u.username}</p>
            </div>
            <button
              onClick={() => sendTo(u)}
              disabled={sentTo.has(u.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-3 text-white text-xs font-semibold disabled:opacity-50"
            >
              <Send size={12} />
              {sentTo.has(u.id) ? "Sent" : "Send"}
            </button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function ShareAction({ icon: Icon, label, onClick }: { icon: typeof Link2; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 shrink-0 w-16">
      <span className="w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center text-white">
        <Icon size={20} />
      </span>
      <span className="text-[11px] text-muted text-center leading-tight">{label}</span>
    </button>
  );
}
