"use client";

import { useEffect, useRef, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Heart, Send, Share2, Radio, Video as VideoIcon, Users, MessageCircle, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCameraRecorder } from "@/hooks/useCameraRecorder";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { ShareMenuSheet } from "@/components/share/ShareMenuSheet";
import { formatCount, formatDuration } from "@/lib/utils";

interface StreamInfo {
  id: string;
  title: string;
  category: string;
  status: string;
  viewerCount: number;
  commentsOn: boolean;
  isHost: boolean;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
}

interface LiveEvent {
  id: string;
  type: "chat" | "reaction" | "join";
  userId: string;
  username: string;
  avatarUrl: string | null;
  text?: string;
  emoji?: string;
}

export default function LiveViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const cam = useCameraRecorder();

  const [stream, setStream] = useState<StreamInfo | null>(null);
  const [error, setError] = useState(false);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [ended, setEnded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [summary, setSummary] = useState<{ durationSec: number; peakViewerCount: number; totalViewers: number; chatCount: number; reactionCount: number } | null>(
    null
  );
  const lastEventId = useRef<string | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    fetch(`/api/live/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setStream(d.stream))
      .catch(() => setError(true));
  }, [id]);

  useEffect(() => {
    if (!stream || stream.isHost || joinedRef.current) return;
    joinedRef.current = true;
    fetch(`/api/live/${id}/join`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => setStream((prev) => (prev ? { ...prev, viewerCount: d.viewerCount } : prev)))
      .catch(() => {});
    return () => {
      fetch(`/api/live/${id}/join`, { method: "DELETE", keepalive: true }).catch(() => {});
    };
  }, [stream, id]);

  useEffect(() => {
    if (!stream || stream.status !== "live") return;
    const viewerCountPoll = setInterval(() => {
      fetch(`/api/live/${id}`)
        .then((r) => r.json())
        .then((d) => setStream((prev) => (prev ? { ...prev, viewerCount: d.stream.viewerCount } : prev)))
        .catch(() => {});
    }, 5000);
    const interval = setInterval(() => {
      const qs = lastEventId.current ? `?since=${lastEventId.current}` : "";
      fetch(`/api/live/${id}/chat${qs}`)
        .then((r) => r.json())
        .then((d: { events: LiveEvent[] }) => {
          if (d.events.length) {
            lastEventId.current = d.events[d.events.length - 1].id;
            setEvents((prev) => [...prev, ...d.events].slice(-60));
            d.events.forEach((e) => {
              if (e.type === "reaction") triggerHeart();
            });
          }
        })
        .catch(() => {});
    }, 2000);
    return () => {
      clearInterval(interval);
      clearInterval(viewerCountPoll);
    };
  }, [stream, id]);

  function triggerHeart() {
    const heartId = Date.now() + Math.random();
    setFloatingHearts((prev) => [...prev, heartId]);
    setTimeout(() => setFloatingHearts((prev) => prev.filter((h) => h !== heartId)), 2000);
  }

  async function sendChat() {
    if (!text.trim()) return;
    const value = text.trim();
    setText("");
    await fetch(`/api/live/${id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "chat", text: value }),
    }).catch(() => {});
  }

  async function sendReaction() {
    triggerHeart();
    await fetch(`/api/live/${id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "reaction", emoji: "❤️" }),
    }).catch(() => {});
  }

  async function endLive() {
    const res = await fetch(`/api/live/${id}/end`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setEnded(true);
    setSummary(data?.summary ?? null);
    toast("success", "Live ended");
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <ErrorState title="This live isn't available" onRetry={() => router.push("/live")} />
      </div>
    );
  }

  if (ended) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6 text-center px-8">
        <div className="flex flex-col items-center gap-2">
          <Radio size={32} className="text-muted-2" />
          <p className="text-white font-semibold text-lg">Live ended</p>
          <p className="text-muted-2 text-xs">
            Live video streaming isn&apos;t recorded — there&apos;s no replay to save, since Fliq LIVE doesn&apos;t run a media server in this environment.
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <SummaryStat icon={Clock} label="Duration" value={formatDuration(summary.durationSec)} />
            <SummaryStat icon={Users} label="Peak viewers" value={formatCount(summary.peakViewerCount)} />
            <SummaryStat icon={Users} label="Total viewers" value={formatCount(summary.totalViewers)} />
            <SummaryStat icon={MessageCircle} label="Chat + reactions" value={formatCount(summary.chatCount + summary.reactionCount)} />
          </div>
        )}

        <Button onClick={() => router.push("/live")}>Done</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {stream?.isHost && cam.videoRef ? (
        <video ref={cam.videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-brand-diag flex items-center justify-center">
          {stream && (
            <div className="text-center px-8">
              <Avatar src={stream.user.avatarUrl} alt={stream.user.displayName} size="2xl" ring />
              <p className="text-white/70 text-xs mt-4 max-w-[220px] mx-auto flex items-center gap-1.5 justify-center">
                <VideoIcon size={12} /> Live video streaming between viewers requires a media server not configured in this environment — chat and reactions below are fully live.
              </p>
            </div>
          )}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/50" />

      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),14px)] z-10">
        <div className="flex items-center gap-2">
          {stream && (
            <>
              <Link href={`/profile/${stream.user.username}`} className="flex items-center gap-2 bg-black/35 rounded-full pl-1 pr-3 py-1">
                <Avatar src={stream.user.avatarUrl} alt={stream.user.displayName} size="xs" />
                <span className="text-white text-xs font-semibold">{stream.user.username}</span>
              </Link>
              <span className="bg-danger text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
              </span>
              <span className="bg-black/35 text-white text-[10px] font-medium px-2 py-1 rounded-full">{formatCount(stream.viewerCount)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShareOpen(true)} aria-label="Share live" className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center text-white">
            <Share2 size={15} />
          </button>
          <button
            onClick={() => (stream?.isHost ? endLive() : router.push("/live"))}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center text-white"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {floatingHearts.map((id) => (
        <Heart key={id} size={28} fill="#f43f5e" className="absolute right-6 bottom-32 text-danger animate-heart-burst pointer-events-none" style={{ animationDuration: "1.8s" }} />
      ))}

      <div className="absolute bottom-0 inset-x-0 z-10 flex flex-col">
        <div className="max-h-[38vh] overflow-y-auto no-scrollbar px-4 pb-2 flex flex-col gap-1.5">
          {events
            .filter((e) => e.type !== "join")
            .map((e) => (
              <div key={e.id} className="text-xs bg-black/30 rounded-lg px-2.5 py-1.5 w-fit max-w-[85%]">
                {e.type === "reaction" ? (
                  <span className="text-white">
                    <span className="font-semibold">{e.username}</span> sent {e.emoji}
                  </span>
                ) : (
                  <span className="text-white">
                    <span className="font-semibold">{e.username}</span> {e.text}
                  </span>
                )}
              </div>
            ))}
        </div>

        {stream?.commentsOn && (
          <div className="flex items-center gap-2 px-3 pb-[max(env(safe-area-inset-bottom),14px)] pt-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder={currentUser ? "Say something..." : "Log in to chat"}
              disabled={!currentUser}
              aria-label="Live chat message"
              className="flex-1 bg-black/35 border border-white/15 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/50 outline-none"
            />
            <button onClick={sendChat} aria-label="Send" className="w-9 h-9 rounded-full bg-black/35 flex items-center justify-center text-white shrink-0">
              <Send size={15} />
            </button>
            <button onClick={sendReaction} aria-label="Send heart" className="w-9 h-9 rounded-full bg-black/35 flex items-center justify-center text-white shrink-0">
              <Heart size={16} />
            </button>
          </div>
        )}

        {stream?.isHost && (
          <div className="px-4 pb-4">
            <Button variant="danger" fullWidth onClick={endLive}>
              End Live
            </Button>
          </div>
        )}
      </div>
      {stream && (
        <ShareMenuSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          kind="live"
          id={stream.id}
          url={`${typeof window !== "undefined" ? window.location.origin : ""}/live/${id}`}
          title="Share live"
        />
      )}
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 flex flex-col items-center gap-1">
      <Icon size={16} className="text-muted-2" />
      <span className="text-white font-bold text-base">{value}</span>
      <span className="text-muted-2 text-[10px]">{label}</span>
    </div>
  );
}
