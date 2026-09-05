"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { CaptionText } from "@/components/feed/CaptionText";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { formatTimeAgo, formatCount } from "@/lib/utils";
import type { CommentDTO } from "@/types/models";
import { Heart, Pin, Trash2, CornerDownRight, Send, MessageCircleOff } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type SortMode = "top" | "newest";

interface MentionCandidate {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export function CommentsSheet({
  videoId,
  open,
  onClose,
  isOwner,
  allowComments,
  onCountChange,
}: {
  videoId: string;
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  allowComments: boolean;
  onCountChange?: (delta: number) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentDTO | null>(null);
  const [posting, setPosting] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("top");
  const inputRef = useRef<HTMLInputElement>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionCandidate[]>([]);
  const mentionStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setComments(null);
    fetch(`/api/videos/${videoId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => setComments([]));
  }, [open, videoId]);

  useEffect(() => {
    if (mentionQuery === null) {
      setMentionResults([]);
      return;
    }
    const handle = setTimeout(() => {
      if (!mentionQuery) {
        setMentionResults([]);
        return;
      }
      fetch(`/api/search?q=${encodeURIComponent(mentionQuery)}&type=users`)
        .then((r) => r.json())
        .then((d) => setMentionResults((d.users ?? []).slice(0, 5)))
        .catch(() => setMentionResults([]));
    }, 150);
    return () => clearTimeout(handle);
  }, [mentionQuery]);

  function handleTextChange(value: string, caretPos: number) {
    setText(value);
    const beforeCaret = value.slice(0, caretPos);
    const match = /(?:^|\s)@(\w*)$/.exec(beforeCaret);
    if (match) {
      mentionStartRef.current = beforeCaret.length - match[1].length - 1;
      setMentionQuery(match[1]);
    } else {
      mentionStartRef.current = null;
      setMentionQuery(null);
    }
  }

  function pickMention(candidate: MentionCandidate) {
    const start = mentionStartRef.current;
    const input = inputRef.current;
    if (start === null || !input) return;
    const caretPos = input.selectionStart ?? text.length;
    const next = `${text.slice(0, start)}@${candidate.username} ${text.slice(caretPos)}`;
    setText(next);
    setMentionQuery(null);
    mentionStartRef.current = null;
    requestAnimationFrame(() => {
      const cursor = start + candidate.username.length + 2;
      input.focus();
      input.setSelectionRange(cursor, cursor);
    });
  }

  async function submit() {
    if (!text.trim() || posting) return;
    setPosting(true);
    const body = { text: text.trim(), parentId: replyTo?.id ?? null };
    setText("");
    setMentionQuery(null);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast("error", data.error || "Couldn't post your comment");
        return;
      }
      setComments((prev) => (prev ? [...prev, data.comment] : [data.comment]));
      onCountChange?.(1);
      setReplyTo(null);
    } catch {
      toast("error", "Check your connection and try again.");
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(c: CommentDTO) {
    setComments((prev) =>
      prev?.map((x) => (x.id === c.id ? { ...x, isLiked: !x.isLiked, likeCount: x.likeCount + (x.isLiked ? -1 : 1) } : x)) ?? null
    );
    await fetch(`/api/comments/${c.id}/like`, { method: c.isLiked ? "DELETE" : "POST" }).catch(() => {});
  }

  async function remove(c: CommentDTO) {
    setComments((prev) => prev?.filter((x) => x.id !== c.id) ?? null);
    onCountChange?.(-1);
    await fetch(`/api/comments/${c.id}`, { method: "DELETE" }).catch(() => {});
  }

  async function togglePin(c: CommentDTO) {
    setComments(
      (prev) => prev?.map((x) => ({ ...x, isPinned: x.id === c.id ? !x.isPinned : false })) ?? null
    );
    await fetch(`/api/comments/${c.id}/pin`, { method: "POST" }).catch(() => {});
  }

  const topLevelUnsorted = comments?.filter((c) => !c.parentId) ?? [];
  const topLevel = [...topLevelUnsorted].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (sortMode === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return b.likeCount - a.likeCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const repliesOf = (id: string) => comments?.filter((c) => c.parentId === id) ?? [];

  return (
    <Sheet open={open} onClose={onClose} title={`${comments ? topLevelUnsorted.length : ""} Comments`.trim()} heightClass="h-[80vh]">
      <div className="flex flex-col h-full">
        {allowComments && topLevel.length > 0 && (
          <div className="flex items-center gap-1 px-4 pt-2.5 pb-1 shrink-0">
            {(["top", "newest"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full",
                  sortMode === mode ? "bg-white/15 text-white" : "text-muted-2"
                )}
              >
                {mode === "top" ? "Top" : "Newest"}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {!allowComments ? (
            <EmptyState icon={MessageCircleOff} title="Comments are off" description="The creator has turned off comments for this video." />
          ) : comments === null ? (
            Array.from({ length: 4 }).map((_, i) => <ListRowSkeleton key={i} />)
          ) : topLevel.length === 0 ? (
            <EmptyState icon={MessageCircleOff} title="No comments yet" description="Be the first to say something." />
          ) : (
            topLevel.map((c) => (
              <div key={c.id}>
                <CommentRow
                  comment={c}
                  canModerate={isOwner}
                  isMine={c.user.id === user?.id}
                  onLike={() => toggleLike(c)}
                  onDelete={() => remove(c)}
                  onPin={() => togglePin(c)}
                  onReply={() => setReplyTo(c)}
                />
                {repliesOf(c.id).map((r) => (
                  <CommentRow
                    key={r.id}
                    comment={r}
                    reply
                    canModerate={isOwner}
                    isMine={r.user.id === user?.id}
                    onLike={() => toggleLike(r)}
                    onDelete={() => remove(r)}
                    onReply={() => setReplyTo(c)}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {allowComments && (
          <div className="shrink-0 border-t border-border p-3 safe-bottom relative">
            {mentionResults.length > 0 && (
              <div className="absolute bottom-full left-3 right-3 mb-1 glass-strong rounded-2xl overflow-hidden border border-border">
                {mentionResults.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => pickMention(m)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left"
                  >
                    <Avatar src={m.avatarUrl} alt={m.displayName} size="xs" />
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">@{m.username}</p>
                      <p className="text-muted-2 text-[11px] truncate">{m.displayName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {replyTo && (
              <div className="flex items-center justify-between px-1 pb-2 text-xs text-muted">
                <span>
                  Replying to <span className="text-white">@{replyTo.user.username}</span>
                </span>
                <button onClick={() => setReplyTo(null)} className="text-muted-2 hover:text-white">
                  Cancel
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Avatar src={user?.avatarUrl} alt={user?.displayName ?? "You"} size="sm" />
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Add a comment..."
                aria-label="Add a comment"
                className="flex-1 bg-surface-2 border border-border rounded-full px-4 py-2.5 text-sm text-white placeholder:text-muted-2 outline-none focus:border-fliq-magenta/50"
              />
              <button
                onClick={submit}
                disabled={!text.trim() || posting}
                aria-label="Post comment"
                className="w-9 h-9 rounded-full bg-gradient-brand-horizontal flex items-center justify-center disabled:opacity-40 shrink-0"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function CommentRow({
  comment,
  reply,
  canModerate,
  isMine,
  onLike,
  onDelete,
  onPin,
  onReply,
}: {
  comment: CommentDTO;
  reply?: boolean;
  canModerate: boolean;
  isMine: boolean;
  onLike: () => void;
  onDelete: () => void;
  onPin?: () => void;
  onReply: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  return (
    <div className={cn("flex gap-3 px-4 py-2.5", reply && "pl-12")}>
      <Avatar src={comment.user.avatarUrl} alt={comment.user.displayName} size={reply ? "xs" : "sm"} verified={comment.user.isVerified} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-white text-xs font-semibold">@{comment.user.username}</span>
          {comment.isPinned && (
            <span className="flex items-center gap-0.5 text-[10px] text-fliq-cyan font-medium">
              <Pin size={10} /> Pinned
            </span>
          )}
          <span className="text-muted-2 text-[11px]">{formatTimeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-white/90 mt-0.5 break-words">
          <CaptionText text={comment.text} />
        </p>
        <div className="flex items-center gap-4 mt-1.5">
          <button onClick={onReply} className="text-muted-2 hover:text-white text-xs flex items-center gap-1">
            <CornerDownRight size={12} /> Reply
          </button>
          {(canModerate || isMine) && (
            <button onClick={() => setShowActions((v) => !v)} className="text-muted-2 hover:text-white text-xs">
              More
            </button>
          )}
        </div>
        {showActions && (
          <div className="flex items-center gap-3 mt-1.5">
            {canModerate && onPin && (
              <button onClick={onPin} className="text-xs text-fliq-cyan flex items-center gap-1">
                <Pin size={12} /> {comment.isPinned ? "Unpin" : "Pin"}
              </button>
            )}
            <button onClick={onDelete} className="text-xs text-danger flex items-center gap-1">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
      </div>
      <button onClick={onLike} className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5" aria-label={comment.isLiked ? "Unlike comment" : "Like comment"}>
        <Heart size={14} className={cn(comment.isLiked ? "fill-danger text-danger" : "text-muted-2")} />
        {comment.likeCount > 0 && <span className="text-[10px] text-muted-2">{formatCount(comment.likeCount)}</span>}
      </button>
    </div>
  );
}
