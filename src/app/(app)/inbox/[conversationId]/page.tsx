"use client";

import { useEffect, useRef, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MoreVertical,
  Send,
  Smile,
  Image as ImageIcon,
  Mic,
  Square,
  CornerUpLeft,
  Trash2,
  X,
  Play,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { ReportSheet } from "@/components/moderation/ReportSheet";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/store/toast";
import { useAuthStore } from "@/store/auth";
import { cn, formatTimeAgo } from "@/lib/utils";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];
const EMOJI_GRID = ["😀", "😂", "😍", "🥲", "😎", "🙌", "🔥", "💯", "🎉", "😭", "🤔", "👀", "❤️", "👍", "🙏", "😴"];

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
}

export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = usePromise(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const [convo, setConvo] = useState<{ id: string; user: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean } | null; online: boolean; isRequest: boolean } | null>(null);
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
    const poll = setInterval(() => loadMessages(false), 3500);
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
        {convo?.user && (
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
        )}
        <button onClick={() => setMoreOpen(true)} aria-label="More options" className="text-white">
          <MoreVertical size={20} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages === null ? (
          <p className="text-center text-muted text-sm mt-8">Loading...</p>
        ) : messages.length === 0 ? (
          <EmptyState icon={Send} title="Say hi 👋" description={`Start the conversation with ${convo?.user?.displayName ?? "them"}.`} />
        ) : (
          messages.map((m) => {
            const isMine = m.sender.id === currentUser?.id;
            return (
              <div key={m.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
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
                {m.reactions.length > 0 && (
                  <div className="flex gap-0.5 -mt-1.5 bg-surface-3 rounded-full px-1.5 py-0.5 border border-border">
                    {[...new Set(m.reactions.map((r) => r.emoji))].map((emoji) => (
                      <span key={emoji} className="text-xs">
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-muted-2 mt-1">{formatTimeAgo(m.createdAt)}</span>
              </div>
            );
          })
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

      {convo?.user && <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={convo.user.id} />}
    </div>
  );
}
