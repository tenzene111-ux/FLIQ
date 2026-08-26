"use client";

import { useEffect, useRef, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  X,
  Heart,
  Send,
  Share2,
  Radio,
  Video as VideoIcon,
  Users,
  MessageCircle,
  Clock,
  Wifi,
  WifiOff,
  MicOff,
  Pin,
  Shield,
  Gift,
  Coins,
  UserPlus2,
  Flag,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCameraRecorder } from "@/hooks/useCameraRecorder";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { ShareMenuSheet } from "@/components/share/ShareMenuSheet";
import { ReportSheet } from "@/components/moderation/ReportSheet";
import { GuestInviteSheet } from "@/components/live/GuestInviteSheet";
import { ModerationSheet } from "@/components/live/ModerationSheet";
import { GiftSheet } from "@/components/live/GiftSheet";
import { formatCount, formatDuration } from "@/lib/utils";

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

interface StreamInfo {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  viewerCount: number;
  commentsOn: boolean;
  giftsEnabled: boolean;
  guestsEnabled: boolean;
  maxGuests: number;
  slowModeSeconds: number;
  coinsEarned: number;
  isHost: boolean;
  role: "creator" | "moderator" | "co-host" | "viewer";
  followStatus: "none" | "pending" | "accepted";
  pinnedMessage: LiveEvent | null;
  participants: Guest[];
  user: PersonBrief;
}

interface LiveEvent {
  id: string;
  type: "chat" | "reaction" | "join" | "gift";
  userId: string;
  username: string;
  avatarUrl: string | null;
  text?: string;
  emoji?: string;
  giftName?: string;
  giftEmoji?: string;
  quantity?: number;
  deleted?: boolean;
}

export default function LiveViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const cam = useCameraRecorder();

  const [stream, setStream] = useState<StreamInfo | null>(null);
  const [followStatus, setFollowStatus] = useState<"none" | "pending" | "accepted">("none");
  const [error, setError] = useState(false);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);
  const [giftBanner, setGiftBanner] = useState<{ id: number; username: string; giftEmoji: string; giftName: string; quantity: number } | null>(null);
  const [text, setText] = useState("");
  const [ended, setEnded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "live" | "live_comment"; id: string }>({ type: "live", id: "" });
  const [guestInviteOpen, setGuestInviteOpen] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [messageMenu, setMessageMenu] = useState<LiveEvent | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [summary, setSummary] = useState<{
    durationSec: number;
    peakViewerCount: number;
    totalViewers: number;
    uniqueViewers: number;
    chatCount: number;
    reactionCount: number;
    newFollowers: number;
    coinsEarned: number;
  } | null>(null);
  const lastEventId = useRef<string | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    fetch(`/api/live/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        if (d.stream.status === "ended") {
          router.replace(`/profile/${d.stream.user.username}`);
          return;
        }
        setStream(d.stream);
        setFollowStatus(d.stream.followStatus);
        setGuests(d.stream.participants ?? []);
      })
      .catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        .then((d) => {
          setStream((prev) => (prev ? { ...prev, viewerCount: d.stream.viewerCount } : prev));
          setGuests(d.stream.participants ?? []);
        })
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
              if (e.type === "gift" && e.giftEmoji && e.giftName) {
                const bannerId = Date.now() + Math.random();
                setGiftBanner({ id: bannerId, username: e.username, giftEmoji: e.giftEmoji, giftName: e.giftName, quantity: e.quantity ?? 1 });
                setTimeout(() => setGiftBanner((prev) => (prev?.id === bannerId ? null : prev)), 3500);
              }
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

  // Host-side reconnection: if the camera stream drops (device sleep, track
  // ended, browser revokes permission), try to reacquire it in place without
  // ending the LIVE or creating a new room.
  useEffect(() => {
    if (!stream?.isHost) return;
    const mediaStream = cam.videoRef.current?.srcObject as MediaStream | null;
    const track = mediaStream?.getVideoTracks()[0];
    if (!track) return;
    const onEnded = () => {
      setReconnecting(true);
      cam.retry();
      fetch(`/api/live/${id}/reconnect`, { method: "POST" }).catch(() => {});
    };
    track.addEventListener("ended", onEnded);
    return () => track.removeEventListener("ended", onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream?.isHost, cam.ready]);

  useEffect(() => {
    if (cam.ready && reconnecting) setReconnecting(false);
  }, [cam.ready, reconnecting]);

  function triggerHeart() {
    const heartId = Date.now() + Math.random();
    setFloatingHearts((prev) => [...prev, heartId]);
    setTimeout(() => setFloatingHearts((prev) => prev.filter((h) => h !== heartId)), 2000);
  }

  async function sendChat() {
    if (!text.trim()) return;
    const value = text.trim();
    setText("");
    const res = await fetch(`/api/live/${id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "chat", text: value }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) toast("error", data?.error || "Couldn't send message");
  }

  async function sendReaction() {
    triggerHeart();
    await fetch(`/api/live/${id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "reaction", emoji: "❤️" }),
    }).catch(() => {});
  }

  async function toggleFollow() {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (!stream) return;
    if (followStatus === "none") {
      setFollowStatus("accepted");
      const res = await fetch(`/api/users/${stream.user.username}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveStreamId: stream.id }),
      }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (data?.status) setFollowStatus(data.status);
    } else {
      setFollowStatus("none");
      await fetch(`/api/users/${stream.user.username}/follow`, { method: "DELETE" }).catch(() => {});
    }
  }

  async function endLive() {
    const res = await fetch(`/api/live/${id}/end`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setEnded(true);
    setSummary(data?.summary ?? null);
    toast("success", "Live ended");
  }

  async function deleteMessage(event: LiveEvent) {
    setMessageMenu(null);
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, deleted: true, text: undefined } : e)));
    await fetch(`/api/live/${id}/chat/${event.id}`, { method: "DELETE" }).catch(() => {});
  }

  async function togglePin(event: LiveEvent) {
    setMessageMenu(null);
    if (stream?.pinnedMessage?.id === event.id) {
      await fetch(`/api/live/${id}/pin`, { method: "DELETE" }).catch(() => {});
      setStream((prev) => (prev ? { ...prev, pinnedMessage: null } : prev));
    } else {
      const res = await fetch(`/api/live/${id}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id }),
      }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (data?.pinnedMessage) setStream((prev) => (prev ? { ...prev, pinnedMessage: data.pinnedMessage } : prev));
    }
  }

  async function muteFromChat(username: string) {
    setMessageMenu(null);
    await fetch(`/api/users/${username}/mute`, { method: "POST" }).catch(() => {});
    toast("success", `Muted @${username}`);
  }

  async function blockFromChat(username: string) {
    setMessageMenu(null);
    await fetch(`/api/users/${username}/block`, { method: "POST" }).catch(() => {});
    toast("success", `Blocked @${username}`);
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
            <SummaryStat icon={Users} label="Unique viewers" value={formatCount(summary.uniqueViewers)} />
            <SummaryStat icon={MessageCircle} label="Chat + reactions" value={formatCount(summary.chatCount + summary.reactionCount)} />
            <SummaryStat icon={UserPlus2} label="New followers" value={`+${formatCount(summary.newFollowers)}`} />
            {summary.coinsEarned > 0 && <SummaryStat icon={Coins} label="Coins earned" value={formatCount(summary.coinsEarned)} />}
          </div>
        )}

        <Button onClick={() => router.push("/live")}>Done</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {stream?.isHost || stream?.role === "co-host" ? (
        <div className="absolute inset-0 flex">
          <div className="relative flex-1">
            {cam.error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-brand-diag px-6 text-center">
                <p className="text-white/80 text-xs">{cam.error}</p>
              </div>
            ) : (
              <video ref={cam.videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
            )}
            {reconnecting && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                <WifiOff size={22} className="text-warning animate-pulse" />
                <p className="text-white text-sm font-medium">Live connection lost</p>
                <p className="text-muted-2 text-xs">Reconnecting...</p>
              </div>
            )}
            <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {stream?.isHost ? "You (Host)" : "You (Guest)"}
            </span>
          </div>
          {stream?.isHost && guests.length > 0 && (
            <div className="w-24 flex flex-col gap-0.5">
              {guests.slice(0, 3).map((g) => (
                <div key={g.userId} className="relative flex-1 bg-gradient-brand-diag flex items-center justify-center">
                  <Avatar src={g.user.avatarUrl} alt={g.user.displayName} size="md" />
                  <span className="absolute bottom-1 inset-x-1 text-center text-white text-[9px] font-semibold truncate">@{g.user.username}</span>
                  {g.mutedByHost && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                      <MicOff size={8} className="text-white" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {stream?.role === "co-host" && (
            <div className="w-24 bg-gradient-brand-diag flex flex-col items-center justify-center gap-1">
              <Avatar src={stream.user.avatarUrl} alt={stream.user.displayName} size="md" />
              <span className="text-white text-[9px] font-semibold">Host</span>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-brand-diag flex items-center justify-center">
          {stream && (
            <div className="text-center px-8">
              <Avatar src={stream.user.avatarUrl} alt={stream.user.displayName} size="2xl" ring />
              <p className="text-white/70 text-xs mt-4 max-w-[220px] mx-auto flex items-center gap-1.5 justify-center">
                <VideoIcon size={12} /> Live video streaming between viewers requires a media server not configured in this environment — chat and reactions below are fully live.
              </p>
              {guests.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {guests.slice(0, 4).map((g) => (
                    <Avatar key={g.userId} src={g.user.avatarUrl} alt={g.user.displayName} size="xs" ring />
                  ))}
                  <span className="text-white/60 text-[11px]">co-hosting</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/50 pointer-events-none" />

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
              {!stream.isHost && stream.role === "viewer" && (
                <button
                  onClick={toggleFollow}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white text-black disabled:opacity-60"
                  disabled={followStatus !== "none"}
                >
                  {followStatus === "accepted" ? "Following" : followStatus === "pending" ? "Requested" : "Follow"}
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stream?.giftsEnabled && !stream.isHost && (
            <button onClick={() => setGiftOpen(true)} aria-label="Send gift" className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center text-warning">
              <Gift size={15} />
            </button>
          )}
          {stream?.isHost && stream.guestsEnabled && (
            <button onClick={() => setGuestInviteOpen(true)} aria-label="Invite guest" className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center text-white">
              <UserPlus2 size={15} />
            </button>
          )}
          {stream?.isHost && (
            <button onClick={() => setModerationOpen(true)} aria-label="Moderation" className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center text-white">
              <Shield size={15} />
            </button>
          )}
          {!stream?.isHost && (
            <button
              onClick={() => {
                setReportTarget({ type: "live", id: stream?.id ?? "" });
                setReportOpen(true);
              }}
              aria-label="Report live"
              className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center text-white"
            >
              <Flag size={14} />
            </button>
          )}
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

      {floatingHearts.map((fid) => (
        <Heart key={fid} size={28} fill="#f43f5e" className="absolute right-6 bottom-32 text-danger animate-heart-burst pointer-events-none" style={{ animationDuration: "1.8s" }} />
      ))}

      {giftBanner && (
        <div className="absolute top-16 inset-x-0 flex justify-center z-10 pointer-events-none">
          <div className="bg-black/60 rounded-full px-4 py-2 flex items-center gap-2 animate-fade-in">
            <span className="text-xl">{giftBanner.giftEmoji}</span>
            <span className="text-white text-xs font-medium">
              <span className="font-semibold">{giftBanner.username}</span> sent {giftBanner.giftName}
              {giftBanner.quantity > 1 ? ` × ${giftBanner.quantity}` : ""}
            </span>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 z-10 flex flex-col">
        {stream?.pinnedMessage && !stream.pinnedMessage.deleted && (
          <div className="mx-4 mb-2 bg-black/45 border border-white/10 rounded-xl px-3 py-2 flex items-start gap-2">
            <Pin size={12} className="text-fliq-cyan shrink-0 mt-0.5" />
            <p className="text-white text-xs leading-snug">
              <span className="font-semibold">@{stream.pinnedMessage.username}</span> {stream.pinnedMessage.text}
            </p>
          </div>
        )}

        <div className="max-h-[32vh] overflow-y-auto no-scrollbar px-4 pb-2 flex flex-col gap-1.5">
          {events
            .filter((e) => e.type !== "join" && e.type !== "gift" && !e.deleted)
            .map((e) => (
              <button
                key={e.id}
                onClick={() => setMessageMenu(e)}
                className="text-xs bg-black/30 rounded-lg px-2.5 py-1.5 w-fit max-w-[85%] text-left"
              >
                {e.type === "reaction" ? (
                  <span className="text-white">
                    <span className="font-semibold">{e.username}</span> sent {e.emoji}
                  </span>
                ) : (
                  <span className="text-white">
                    <span className="font-semibold">{e.username}</span> {e.text}
                  </span>
                )}
              </button>
            ))}
        </div>

        {stream?.slowModeSeconds ? (
          <p className="px-4 pb-1 text-muted-2 text-[10px]">Slow mode is on — {stream.slowModeSeconds}s between messages</p>
        ) : null}

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
        <>
          <ShareMenuSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            kind="live"
            id={stream.id}
            url={`${typeof window !== "undefined" ? window.location.origin : ""}/live/${id}`}
            title="Share live"
          />
          <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType={reportTarget.type} targetId={reportTarget.id} />
          {stream.isHost && (
            <>
              <GuestInviteSheet
                open={guestInviteOpen}
                onClose={() => setGuestInviteOpen(false)}
                liveId={stream.id}
                invitedUsernames={new Set(guests.map((g) => g.user.username))}
              />
              <ModerationSheet open={moderationOpen} onClose={() => setModerationOpen(false)} liveId={stream.id} guests={guests} onGuestsChange={setGuests} />
            </>
          )}
          {stream.giftsEnabled && !stream.isHost && (
            <GiftSheet open={giftOpen} onClose={() => setGiftOpen(false)} liveId={stream.id} onSent={() => toast("success", "Gift sent!")} />
          )}
        </>
      )}

      <Sheet open={!!messageMenu} onClose={() => setMessageMenu(null)}>
        {messageMenu && (
          <div className="px-2 pb-3">
            {(stream?.role === "creator" || stream?.role === "moderator") && (
              <>
                <MenuItem icon={Pin} label={stream?.pinnedMessage?.id === messageMenu.id ? "Unpin message" : "Pin message"} onClick={() => togglePin(messageMenu)} />
                <MenuItem icon={X} label="Delete message" danger onClick={() => deleteMessage(messageMenu)} />
              </>
            )}
            {currentUser?.id !== messageMenu.userId && (
              <>
                <MenuItem icon={MicOff} label={`Mute @${messageMenu.username}`} onClick={() => muteFromChat(messageMenu.username)} />
                <MenuItem
                  icon={Flag}
                  label="Report message"
                  onClick={() => {
                    setMessageMenu(null);
                    setReportTarget({ type: "live_comment", id: messageMenu.id });
                    setReportOpen(true);
                  }}
                />
                <MenuItem icon={X} label={`Block @${messageMenu.username}`} danger onClick={() => blockFromChat(messageMenu.username)} />
              </>
            )}
          </div>
        )}
      </Sheet>
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

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Wifi; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left ${danger ? "text-danger" : "text-white"}`}
    >
      <Icon size={19} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
