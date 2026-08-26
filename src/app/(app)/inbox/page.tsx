"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SquarePen, MessageCircle, Users, Check, X as XIcon, ChevronLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StoryTray } from "@/components/stories/StoryTray";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { Sheet } from "@/components/ui/Sheet";
import { formatTimeAgo, cn } from "@/lib/utils";
import { toast } from "@/store/toast";

interface ConversationRow {
  id: string;
  isGroup: boolean;
  name: string | null;
  avatarUrl: string | null;
  memberCount: number | null;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean } | null;
  online: boolean;
  lastMessage: { text: string | null; type: string; createdAt: string; senderId: string; senderUsername: string } | null;
  unreadCount: number;
}

export default function InboxPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"messages" | "requests">("messages");
  const [conversations, setConversations] = useState<ConversationRow[] | null>(null);
  const [error, setError] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  function load() {
    setError(false);
    setConversations(null);
    fetch(`/api/conversations?tab=${tab}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setConversations(d.conversations))
      .catch(() => setError(true));
  }

  useEffect(load, [tab]);

  async function acceptRequest(id: string) {
    await fetch(`/api/conversations/${id}/accept`, { method: "POST" }).catch(() => {});
    toast("success", "Request accepted");
    load();
  }

  async function declineRequest(id: string) {
    await fetch(`/api/conversations/${id}/accept`, { method: "DELETE" }).catch(() => {});
    setConversations((prev) => prev?.filter((c) => c.id !== id) ?? null);
  }

  return (
    <PageContainer className="max-w-2xl mx-auto w-full safe-top">
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <h1 className="text-2xl font-bold text-white">Inbox</h1>
        <button onClick={() => setNewMessageOpen(true)} aria-label="New message" className="text-white">
          <SquarePen size={22} />
        </button>
      </div>

      <StoryTray />

      <div className="flex items-center gap-6 px-4 border-b border-border">
        {(["messages", "requests"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("pb-3 text-sm font-semibold capitalize border-b-2 -mb-px", tab === t ? "text-white border-white" : "text-muted-2 border-transparent")}
          >
            {t}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : conversations === null ? (
        Array.from({ length: 5 }).map((_, i) => <ListRowSkeleton key={i} />)
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={tab === "messages" ? "Start a conversation." : "No message requests"}
          description={tab === "messages" ? "Your conversations with other creators will show up here." : undefined}
          action={
            tab === "messages" ? (
              <button onClick={() => setNewMessageOpen(true)} className="text-fliq-cyan text-sm font-semibold">
                New message
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col">
          {conversations.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
              <Link href={`/inbox/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative shrink-0">
                  {c.isGroup ? (
                    <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center overflow-hidden">
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatarUrl} alt={c.name ?? "Group"} className="w-full h-full object-cover" />
                      ) : (
                        <Users size={18} className="text-muted-2" />
                      )}
                    </div>
                  ) : (
                    <>
                      <Avatar src={c.user?.avatarUrl} alt={c.user?.displayName ?? "User"} size="md" verified={c.user?.isVerified} />
                      {c.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-background" />}
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate">
                    {c.isGroup ? (c.name ?? "Group") : c.user?.displayName}
                    {c.isGroup && <span className="text-muted-2 font-normal"> · {c.memberCount}</span>}
                  </p>
                  <p className="text-muted-2 text-xs truncate">
                    {c.lastMessage ? lastMessagePreview(c.lastMessage, c.isGroup) : "Say hi 👋"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {c.lastMessage && <span className="text-[11px] text-muted-2">{formatTimeAgo(c.lastMessage.createdAt)}</span>}
                  {c.unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-fliq-magenta text-[10px] font-bold text-white flex items-center justify-center">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </Link>
              {tab === "requests" && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => acceptRequest(c.id)} aria-label="Accept" className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center">
                    <Check size={16} />
                  </button>
                  <button onClick={() => declineRequest(c.id)} aria-label="Decline" className="w-8 h-8 rounded-full bg-danger/20 text-danger flex items-center justify-center">
                    <XIcon size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <NewMessageSheet open={newMessageOpen} onClose={() => setNewMessageOpen(false)} onStart={(id) => router.push(`/inbox/${id}`)} />
    </PageContainer>
  );
}

type Person = { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };

function NewMessageSheet({ open, onClose, onStart }: { open: boolean; onClose: () => void; onStart: (conversationId: string) => void }) {
  const [mode, setMode] = useState<"pick" | "group">("pick");
  const [users, setUsers] = useState<Person[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [groupSelected, setGroupSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("pick");
    setGroupSelected(new Set());
    setGroupName("");
    fetch("/api/users/me/following")
      .then((r) => r.json())
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]));
  }, [open]);

  async function start(username: string) {
    setStarting(username);
    try {
      const res = await fetch(`/api/conversations/with/${username}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onClose();
      onStart(data.conversationId);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Couldn't start conversation");
    } finally {
      setStarting(null);
    }
  }

  function toggleGroupMember(username: string) {
    setGroupSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }

  async function createGroup() {
    if (!groupName.trim() || groupSelected.size < 2) return;
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/conversations/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim(), usernames: [...groupSelected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onClose();
      onStart(data.conversationId);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Couldn't create group");
    } finally {
      setCreatingGroup(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={mode === "pick" ? "New message" : "New group"}>
      {mode === "pick" ? (
        <div className="pb-4">
          <button onClick={() => setMode("group")} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left">
            <span className="w-10 h-10 rounded-full bg-gradient-brand-soft flex items-center justify-center text-fliq-cyan shrink-0">
              <Users size={18} />
            </span>
            <p className="text-white text-sm font-semibold">New group</p>
          </button>
          {users === null && <p className="text-center text-muted text-sm py-6">Loading...</p>}
          {users?.length === 0 && <EmptyState icon={MessageCircle} title="Follow people to message them" className="py-8" />}
          {users?.map((u) => (
            <button key={u.id} onClick={() => start(u.username)} disabled={!!starting} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left disabled:opacity-60">
              <Avatar src={u.avatarUrl} alt={u.displayName} size="md" verified={u.isVerified} />
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{u.displayName}</p>
                <p className="text-muted-2 text-xs truncate">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="pb-4">
          <div className="px-4 flex items-center gap-2 mb-3">
            <button onClick={() => setMode("pick")} aria-label="Back" className="text-white">
              <ChevronLeft size={18} />
            </button>
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="flex-1" />
          </div>
          <p className="px-4 text-xs text-muted mb-2">Add at least 2 people</p>
          {users?.map((u) => {
            const active = groupSelected.has(u.username);
            return (
              <button key={u.id} onClick={() => toggleGroupMember(u.username)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left">
                <Avatar src={u.avatarUrl} alt={u.displayName} size="md" verified={u.isVerified} />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate">{u.displayName}</p>
                  <p className="text-muted-2 text-xs truncate">@{u.username}</p>
                </div>
                <span className={cn("w-5 h-5 rounded-full border flex items-center justify-center shrink-0", active ? "bg-fliq-magenta border-fliq-magenta" : "border-border")}>
                  {active && <Check size={12} className="text-white" />}
                </span>
              </button>
            );
          })}
          <div className="px-4 pt-3">
            <Button fullWidth disabled={!groupName.trim() || groupSelected.size < 2} loading={creatingGroup} onClick={createGroup}>
              Create group{groupSelected.size > 0 ? ` (${groupSelected.size})` : ""}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function lastMessagePreview(m: { text: string | null; type: string; senderUsername: string }, isGroup: boolean): string {
  const prefix = isGroup ? `${m.senderUsername}: ` : "";
  switch (m.type) {
    case "text":
      return prefix + (m.text ?? "");
    case "image":
      return prefix + "Sent a photo";
    case "video":
      return prefix + "Sent a video";
    case "audio":
      return prefix + "Sent a voice message";
    case "gif":
      return prefix + "Sent a GIF";
    case "post":
      return prefix + "Shared a post";
    case "profile":
      return prefix + "Shared a profile";
    case "hashtag":
      return prefix + "Shared a hashtag";
    case "sound":
      return prefix + "Shared a sound";
    case "live":
      return prefix + "Shared a LIVE";
    default:
      return prefix + "Sent a message";
  }
}
