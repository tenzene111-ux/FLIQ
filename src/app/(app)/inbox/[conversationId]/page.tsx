"use client";

import { useEffect, useRef, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MoreVertical,
  MoreHorizontal,
  Send,
  Smile,
  Image as ImageIcon,
  Mic,
  Square,
  CornerUpLeft,
  Trash2,
  X,
  Play,
  Hash,
  Music2,
  Radio,
  Film,
  Users,
  UserPlus,
  UserMinus,
  LogOut,
  BellOff,
  Bell,
  Pencil,
  Crown,
  Check,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { ReportSheet } from "@/components/moderation/ReportSheet";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/store/toast";
import { useAuthStore } from "@/store/auth";
import { cn, formatTimeAgo, formatCount } from "@/lib/utils";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];
const EMOJI_GRID = ["😀", "😂", "😍", "🥲", "😎", "🙌", "🔥", "💯", "🎉", "😭", "🤔", "👀", "❤️", "👍", "🙏", "😴"];

interface GroupMember {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  role: "owner" | "admin" | "member";
  isMe: boolean;
}

type ConvoState =
  | { id: string; isGroup: false; user: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean } | null; online: boolean; isRequest: boolean; otherLastReadAt: string | null }
  | { id: string; isGroup: true; name: string | null; avatarUrl: string | null; isRequest: false; myRole: "owner" | "admin" | "member"; myMuted: boolean; members: GroupMember[] };

interface Message {
  id: string;
  conversationId: string;
  type: string;
  text: string | null;
  mediaUrl: string | null;
  isDeleted: boolean;
  createdAt: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  reactions: { emoji: string; user: { id: string; username: string } }[];
  replyTo: { id: string; text: string | null; sender: { username: string } } | null;
  sharedVideo: { id: string; thumbnailUrl: string; caption: string; postType: string; isAvailable: boolean; user: { username: string; displayName: string } } | null;
  sharedUser: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean } | null;
  sharedHashtag: { tag: string; viewCount: number } | null;
  sharedSound: { id: string; title: string; artist: string; coverUrl: string; isOriginal: boolean } | null;
  sharedLive: { id: string; title: string; isLive: boolean; viewerCount: number; user: { username: string; displayName: string; avatarUrl: string | null } } | null;
}

export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = usePromise(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const [convo, setConvo] = useState<ConvoState | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunks = useRef<Blob[]>([]);

  function loadConvo() {
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setConvo(d.conversation))
      .catch(() => setError(true));
  }

  function loadMessages(scroll = true) {
    fetch(`/api/conversations/${conversationId}/messages`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages);
        if (scroll) requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
      })
      .catch(() => setError(true));
  }

  useEffect(() => {
    loadConvo();
    loadMessages();
    fetch(`/api/conversations/${conversationId}/read`, { method: "POST" }).catch(() => {});
    const poll = setInterval(() => {
      loadMessages(false);
      loadConvo();
    }, 3500);
    const typingPoll = setInterval(() => {
      fetch(`/api/conversations/${conversationId}/typing`)
        .then((r) => r.json())
        .then((d) => setOtherTyping(d.typing))
        .catch(() => {});
    }, 2500);
    return () => {
      clearInterval(poll);
      clearInterval(typingPoll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  function pingTyping() {
    fetch(`/api/conversations/${conversationId}/typing`, { method: "POST" }).catch(() => {});
  }

  function handleTextChange(v: string) {
    setText(v);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    pingTyping();
    typingTimeout.current = setTimeout(() => {}, 2000);
  }

  async function sendMessage(payload: { type: string; text?: string; mediaUrl?: string }) {
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, replyToId: replyTo?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => (prev ? [...prev, data.message] : [data.message]));
      setText("");
      setReplyTo(null);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Message failed to send");
    } finally {
      setSending(false);
    }
  }

  function handleSendText() {
    if (!text.trim()) return;
    sendMessage({ type: "text", text: text.trim() });
  }

  async function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/media", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await sendMessage({ type: data.kind, mediaUrl: data.url });
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Upload failed");
      setSending(false);
    }
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunks.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => e.data.size && voiceChunks.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(voiceChunks.current, { type: "audio/webm" });
        if (blob.size < 500) return;
        const form = new FormData();
        form.append("file", blob, "voice.webm");
        setSending(true);
        try {
          const res = await fetch("/api/upload/media", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          await sendMessage({ type: "audio", mediaUrl: data.url });
        } catch {
          toast("error", "Couldn't send voice message");
          setSending(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast("error", "Microphone access is required to record a voice message");
    }
  }

  function stopVoiceRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function toggleReaction(message: Message, emoji: string) {
    setActiveMessage(null);
    const res = await fetch(`/api/messages/${message.id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    const data = await res.json();
    if (res.ok) setMessages((prev) => prev?.map((m) => (m.id === message.id ? data.message : m)) ?? null);
  }

  async function deleteMessage(message: Message) {
    setActiveMessage(null);
    setMessages((prev) => prev?.map((m) => (m.id === message.id ? { ...m, isDeleted: true, text: null, mediaUrl: null } : m)) ?? null);
    await fetch(`/api/messages/${message.id}`, { method: "DELETE" }).catch(() => {});
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <ErrorState onRetry={() => { setError(false); loadConvo(); loadMessages(); }} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),14px)] pb-3 border-b border-border shrink-0">
        <button onClick={() => router.push("/inbox")} className="text-white" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        {convo?.isGroup ? (
          <button onClick={() => setMoreOpen(true)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
            <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center overflow-hidden shrink-0">
              {convo.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={convo.avatarUrl} alt={convo.name ?? "Group"} className="w-full h-full object-cover" />
              ) : (
                <Users size={16} className="text-muted-2" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{convo.name ?? "Group"}</p>
              <p className="text-muted-2 text-xs truncate">{otherTyping ? "Someone is typing..." : `${convo.members.length} members`}</p>
            </div>
          </button>
        ) : (
          convo?.user && (
            <Link href={`/profile/${convo.user.username}`} className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="relative">
                <Avatar src={convo.user.avatarUrl} alt={convo.user.displayName} size="sm" verified={convo.user.isVerified} />
                {convo.online && <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-success border-2 border-background" />}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{convo.user.displayName}</p>
                <p className="text-muted-2 text-xs truncate">{otherTyping ? "typing..." : convo.online ? "Online" : "Offline"}</p>
              </div>
            </Link>
          )
        )}
        <button onClick={() => setMoreOpen(true)} aria-label="More options" className="text-white">
          <MoreVertical size={20} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages === null ? (
          <p className="text-center text-muted text-sm mt-8">Loading...</p>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={Send}
            title="Say hi 👋"
            description={convo?.isGroup ? `Start the conversation in ${convo.name ?? "the group"}.` : `Start the conversation with ${convo?.user?.displayName ?? "them"}.`}
          />
        ) : (
          (() => {
            const lastMine = [...messages].reverse().find((m) => m.sender.id === currentUser?.id);
            return messages.map((m) => {
            const isMine = m.sender.id === currentUser?.id;
            const isShared = ["post", "profile", "hashtag", "sound", "live"].includes(m.type) && !m.isDeleted;
            const isLastMine = isMine && m.id === lastMine?.id;
            const otherLastReadAt = convo && !convo.isGroup ? convo.otherLastReadAt : null;
            const seen = isLastMine && otherLastReadAt && new Date(otherLastReadAt) >= new Date(m.createdAt);
            return (
              <div key={m.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                {isShared ? (
                  <div className="relative max-w-[220px] w-full">
                    <SharedPreviewCard message={m} />
                    <button
                      onClick={() => setActiveMessage(m)}
                      aria-label="Message options"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface-3 border border-border flex items-center justify-center text-white"
                    >
                      <MoreHorizontal size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => !m.isDeleted && setActiveMessage(m)}
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm text-left",
                      isMine ? "bg-gradient-brand-horizontal text-white rounded-br-md" : "bg-surface-2 text-white rounded-bl-md"
                    )}
                  >
                    {m.replyTo && (
                      <div className="text-xs opacity-70 border-l-2 border-white/40 pl-2 mb-1.5">
                        <span className="font-semibold">@{m.replyTo.sender.username}</span> {m.replyTo.text ?? "Message"}
                      </div>
                    )}
                    {m.isDeleted ? (
                      <span className="italic opacity-60">Message deleted</span>
                    ) : m.type === "text" ? (
                      m.text
                    ) : m.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.mediaUrl ?? ""} alt="Shared image" className="rounded-lg max-w-[220px] max-h-[280px] object-cover" />
                    ) : m.type === "video" ? (
                      <video src={m.mediaUrl ?? ""} controls className="rounded-lg max-w-[220px] max-h-[280px]" />
                    ) : m.type === "audio" ? (
                      <div className="flex items-center gap-2 py-1">
                        <Play size={16} />
                        <audio src={m.mediaUrl ?? ""} controls className="h-8 max-w-[180px]" />
                      </div>
                    ) : (
                      <span>{m.text}</span>
                    )}
                  </button>
                )}
                {m.reactions.length > 0 && (
                  <div className="flex gap-0.5 -mt-1.5 bg-surface-3 rounded-full px-1.5 py-0.5 border border-border">
                    {[...new Set(m.reactions.map((r) => r.emoji))].map((emoji) => (
                      <span key={emoji} className="text-xs">
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-muted-2 mt-1">
                  {formatTimeAgo(m.createdAt)}
                  {isLastMine && otherLastReadAt != null && <span className="ml-1.5">· {seen ? "Seen" : "Sent"}</span>}
                </span>
              </div>
            );
            });
          })()
        )}
        {otherTyping && (
          <div className="flex items-center gap-1 bg-surface-2 rounded-2xl px-4 py-2.5 w-fit">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-2 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
      </div>

      {replyTo && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface-2">
          <span className="text-xs text-muted flex items-center gap-1.5">
            <CornerUpLeft size={12} /> Replying to @{replyTo.sender.username}
          </span>
          <button onClick={() => setReplyTo(null)} aria-label="Cancel reply">
            <X size={14} className="text-muted-2" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-3 border-t border-border shrink-0 safe-bottom">
        <button onClick={() => fileInputRef.current?.click()} aria-label="Attach media" className="text-muted-2 hover:text-white p-1.5">
          <ImageIcon size={20} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileAttach} />
        <button onClick={() => setEmojiOpen(true)} aria-label="Emoji" className="text-muted-2 hover:text-white p-1.5">
          <Smile size={20} />
        </button>
        <input
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendText()}
          placeholder="Message..."
          aria-label="Message"
          className="flex-1 bg-surface-2 border border-border rounded-full px-4 py-2.5 text-sm text-white placeholder:text-muted-2 outline-none"
        />
        {text.trim() ? (
          <button onClick={handleSendText} disabled={sending} aria-label="Send" className="w-9 h-9 rounded-full bg-gradient-brand-horizontal flex items-center justify-center shrink-0 disabled:opacity-50">
            <Send size={16} className="text-white" />
          </button>
        ) : (
          <button
            onPointerDown={startVoiceRecording}
            onPointerUp={stopVoiceRecording}
            onPointerLeave={() => recording && stopVoiceRecording()}
            aria-label="Hold to record voice message"
            className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", recording ? "bg-danger" : "bg-surface-3")}
          >
            {recording ? <Square size={14} className="text-white" fill="white" /> : <Mic size={16} className="text-white" />}
          </button>
        )}
      </div>

      <Sheet open={emojiOpen} onClose={() => setEmojiOpen(false)} title="Emoji">
        <div className="grid grid-cols-8 gap-2 px-4 pb-4">
          {EMOJI_GRID.map((e) => (
            <button
              key={e}
              onClick={() => {
                setText((t) => t + e);
                setEmojiOpen(false);
              }}
              className="text-2xl hover:scale-110 transition-transform"
            >
              {e}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={!!activeMessage} onClose={() => setActiveMessage(null)} title="Message">
        <div className="px-4 pb-2 flex gap-2 justify-center">
          {REACTION_EMOJIS.map((e) => (
            <button key={e} onClick={() => activeMessage && toggleReaction(activeMessage, e)} className="text-2xl hover:scale-125 transition-transform">
              {e}
            </button>
          ))}
        </div>
        <div className="px-2 pb-3">
          <button
            onClick={() => {
              setReplyTo(activeMessage);
              setActiveMessage(null);
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left text-white"
          >
            <CornerUpLeft size={18} /> <span className="text-sm font-medium">Reply</span>
          </button>
          {activeMessage?.sender.id === currentUser?.id && (
            <button onClick={() => activeMessage && deleteMessage(activeMessage)} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left text-danger">
              <Trash2 size={18} /> <span className="text-sm font-medium">Delete</span>
            </button>
          )}
        </div>
      </Sheet>

      {convo?.isGroup ? (
        <GroupInfoSheet
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          conversationId={conversationId}
          convo={convo}
          onUpdated={loadConvo}
          onLeft={() => router.push("/inbox")}
        />
      ) : (
        <Sheet open={moreOpen} onClose={() => setMoreOpen(false)}>
          <div className="px-2 pb-3">
            {convo?.user && (
              <Link href={`/profile/${convo.user.username}`} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left text-white">
                <Avatar src={convo.user.avatarUrl} alt={convo.user.displayName} size="xs" />
                <span className="text-sm font-medium">View profile</span>
              </Link>
            )}
            <button
              onClick={async () => {
                if (!convo?.user) return;
                setMoreOpen(false);
                await fetch(`/api/users/${convo.user.username}/block`, { method: "POST" }).catch(() => {});
                toast("success", `Blocked @${convo.user.username}`);
                router.push("/inbox");
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left text-white"
            >
              <X size={18} /> <span className="text-sm font-medium">Block user</span>
            </button>
            <button
              onClick={() => {
                setMoreOpen(false);
                setReportOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left text-danger"
            >
              <Trash2 size={18} /> <span className="text-sm font-medium">Report user</span>
            </button>
          </div>
        </Sheet>
      )}

      {convo && !convo.isGroup && convo.user && <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={convo.user.id} />}
    </div>
  );
}

function SharedPreviewCard({ message }: { message: Message }) {
  const cardClass = "block rounded-2xl overflow-hidden border border-border bg-surface-2";

  if (message.type === "post" && message.sharedVideo) {
    const v = message.sharedVideo;
    if (!v.isAvailable) {
      return <div className={cn(cardClass, "px-3.5 py-3 text-sm text-muted italic")}>This post is no longer available</div>;
    }
    return (
      <Link href={`/video/${v.id}`} className={cardClass}>
        <div className="relative aspect-[9/16] max-h-[240px] bg-surface-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.thumbnailUrl} alt={v.caption} className="w-full h-full object-cover" />
          {v.postType === "video" && (
            <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white">
              <Film size={12} />
            </span>
          )}
        </div>
        <div className="px-3 py-2">
          <p className="text-white text-xs font-semibold truncate">@{v.user.username}</p>
          {v.caption && <p className="text-muted-2 text-xs truncate mt-0.5">{v.caption}</p>}
        </div>
      </Link>
    );
  }

  if (message.type === "profile" && message.sharedUser) {
    const u = message.sharedUser;
    return (
      <Link href={`/profile/${u.username}`} className={cn(cardClass, "flex items-center gap-2.5 px-3 py-3")}>
        <Avatar src={u.avatarUrl} alt={u.displayName} size="md" verified={u.isVerified} />
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{u.displayName}</p>
          <p className="text-muted-2 text-xs truncate">@{u.username}</p>
        </div>
      </Link>
    );
  }

  if (message.type === "hashtag" && message.sharedHashtag) {
    const h = message.sharedHashtag;
    return (
      <Link href={`/discover/hashtag/${h.tag}`} className={cn(cardClass, "flex items-center gap-2.5 px-3 py-3")}>
        <span className="w-9 h-9 rounded-full bg-gradient-brand-soft flex items-center justify-center text-fliq-cyan font-bold shrink-0">
          <Hash size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">#{h.tag}</p>
          <p className="text-muted-2 text-xs">{formatCount(h.viewCount)} views</p>
        </div>
      </Link>
    );
  }

  if (message.type === "sound" && message.sharedSound) {
    const s = message.sharedSound;
    return (
      <Link href={`/sounds/${s.id}`} className={cn(cardClass, "flex items-center gap-2.5 px-3 py-3")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.coverUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{s.isOriginal ? "original sound" : s.title}</p>
          <p className="text-muted-2 text-xs truncate">{s.artist}</p>
        </div>
        <Music2 size={14} className="text-muted-2 shrink-0" />
      </Link>
    );
  }

  if (message.type === "live" && message.sharedLive) {
    const l = message.sharedLive;
    return (
      <Link href={`/live/${l.id}`} className={cn(cardClass, "flex items-center gap-2.5 px-3 py-3")}>
        <div className="relative shrink-0">
          <Avatar src={l.user.avatarUrl} alt={l.user.displayName} size="md" />
          {l.isLive && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-danger text-white text-[8px] font-bold px-1.5 py-px rounded-full">LIVE</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">@{l.user.username}</p>
          <p className="text-muted-2 text-xs truncate">{l.isLive ? l.title : "This LIVE has ended"}</p>
        </div>
        <Radio size={14} className={cn("shrink-0", l.isLive ? "text-danger" : "text-muted-2")} />
      </Link>
    );
  }

  return <div className={cn(cardClass, "px-3.5 py-3 text-sm text-muted italic")}>Shared content unavailable</div>;
}

function GroupInfoSheet({
  open,
  onClose,
  conversationId,
  convo,
  onUpdated,
  onLeft,
}: {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  convo: Extract<ConvoState, { isGroup: true }>;
  onUpdated: () => void;
  onLeft: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(convo.name ?? "");
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const canManage = convo.myRole === "owner" || convo.myRole === "admin";

  async function saveName() {
    if (!nameInput.trim() || nameInput.trim() === convo.name) {
      setRenaming(false);
      return;
    }
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput.trim() }),
    }).catch(() => {});
    setRenaming(false);
    onUpdated();
  }

  async function changeAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload/media", { method: "POST", body: form }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (data?.url) {
      await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: data.url }),
      }).catch(() => {});
      onUpdated();
    }
  }

  async function removeMember(userId: string) {
    setBusy(true);
    await fetch(`/api/conversations/${conversationId}/members/${userId}`, { method: "DELETE" }).catch(() => {});
    setBusy(false);
    onUpdated();
  }

  async function toggleMute() {
    await fetch(`/api/conversations/${conversationId}/mute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ muted: !convo.myMuted }),
    }).catch(() => {});
    onUpdated();
  }

  async function leaveGroup() {
    if (!window.confirm("Leave this group?")) return;
    setBusy(true);
    await fetch(`/api/conversations/${conversationId}/leave`, { method: "POST" }).catch(() => {});
    onLeft();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Group info">
      <div className="px-4 pb-2 flex flex-col items-center gap-2">
        <button onClick={() => canManage && avatarInputRef.current?.click()} className="relative w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center overflow-hidden">
          {convo.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={convo.avatarUrl} alt={convo.name ?? "Group"} className="w-full h-full object-cover" />
          ) : (
            <Users size={26} className="text-muted-2" />
          )}
          {canManage && (
            <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Pencil size={14} className="text-white" />
            </span>
          )}
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={changeAvatar} />

        {renaming ? (
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="bg-surface-2 border border-border rounded-lg px-2.5 py-1 text-white text-sm text-center outline-none"
          />
        ) : (
          <button onClick={() => canManage && setRenaming(true)} className="flex items-center gap-1.5">
            <p className="text-white font-semibold text-sm">{convo.name ?? "Group"}</p>
            {canManage && <Pencil size={12} className="text-muted-2" />}
          </button>
        )}
        <p className="text-muted-2 text-xs">{convo.members.length} members</p>
      </div>

      <div className="px-4 flex gap-2 py-3">
        {canManage && (
          <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus size={14} /> Add members
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={toggleMute}>
          {convo.myMuted ? <Bell size={14} /> : <BellOff size={14} />} {convo.myMuted ? "Unmute" : "Mute"}
        </Button>
        <Button variant="secondary" size="sm" onClick={leaveGroup} disabled={busy}>
          <LogOut size={14} /> Leave
        </Button>
      </div>

      <div className="pb-3 max-h-[40vh] overflow-y-auto">
        {convo.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-2">
            <Avatar src={m.avatarUrl} alt={m.displayName} size="sm" verified={m.isVerified} />
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate flex items-center gap-1">
                {m.displayName} {m.isMe && <span className="text-muted-2 font-normal">(you)</span>}
                {m.role === "owner" && <Crown size={12} className="text-fliq-magenta" />}
              </p>
              <p className="text-muted-2 text-xs truncate">@{m.username}</p>
            </div>
            {canManage && !m.isMe && m.role !== "owner" && (
              <button onClick={() => removeMember(m.id)} disabled={busy} aria-label={`Remove ${m.displayName}`} className="text-muted-2 hover:text-danger p-1">
                <UserMinus size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <AddMembersSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        conversationId={conversationId}
        existingUsernames={convo.members.map((m) => m.username)}
        onAdded={onUpdated}
      />
    </Sheet>
  );
}

function AddMembersSheet({
  open,
  onClose,
  conversationId,
  existingUsernames,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  existingUsernames: string[];
  onAdded: () => void;
}) {
  const [users, setUsers] = useState<{ id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean }[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const existing = new Set(existingUsernames);

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

  async function submit() {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAdded();
      onClose();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Couldn't add members");
    } finally {
      setAdding(false);
    }
  }

  const selectable = users?.filter((u) => !existing.has(u.username)) ?? null;

  return (
    <Sheet open={open} onClose={onClose} title="Add members">
      <div className="pb-3">
        {selectable === null && <p className="text-center text-muted text-sm py-6">Loading...</p>}
        {selectable?.length === 0 && <p className="text-center text-muted text-sm py-6">Everyone you follow is already in this group.</p>}
        {selectable?.map((u) => {
          const active = selected.has(u.username);
          return (
            <button key={u.id} onClick={() => toggle(u.username)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left">
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
      </div>
      {!!selectable?.length && (
        <div className="px-4 pb-4">
          <Button fullWidth disabled={selected.size === 0} loading={adding} onClick={submit}>
            Add{selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
