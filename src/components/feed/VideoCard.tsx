"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Repeat2,
  MoreHorizontal,
  Play,
  MapPin,
  Music2,
  SquareSplitHorizontal,
  Scissors,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CaptionText } from "@/components/feed/CaptionText";
import { CommentsSheet } from "@/components/feed/CommentsSheet";
import { ShareSheet } from "@/components/feed/ShareSheet";
import { ReportSheet } from "@/components/moderation/ReportSheet";
import { Sheet } from "@/components/ui/Sheet";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { cn, formatCount } from "@/lib/utils";
import type { VideoDTO } from "@/types/models";
import { EyeOff, Flag, Info, Pin, PinOff } from "lucide-react";

export function VideoCard({
  video,
  isActive,
  preload,
  onNotInterested,
}: {
  video: VideoDTO;
  isActive: boolean;
  preload?: boolean;
  onNotInterested?: (id: string) => void;
}) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const isPhoto = video.postType === "photo";
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("fliq_muted") === "1";
  });
  const [progress, setProgress] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [errored, setErrored] = useState(false);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [liked, setLiked] = useState(video.viewer.isLiked);
  const [likeCount, setLikeCount] = useState(video.counts.likes);
  const [saved, setSaved] = useState(video.viewer.isSaved);
  const [saveCount, setSaveCount] = useState(video.counts.saves);
  const [reposted, setReposted] = useState(video.viewer.isReposted);
  const [repostCount, setRepostCount] = useState(video.counts.reposts);
  const [commentCount, setCommentCount] = useState(video.counts.comments);
  const [shareCount, setShareCount] = useState(video.counts.shares);
  const [followStatus, setFollowStatus] = useState<"none" | "pending" | "accepted">(video.viewer.isFollowingAuthor ? "accepted" : "none");

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pinned, setPinned] = useState(video.isPinned);

  async function togglePin() {
    setMoreOpen(false);
    const res = await fetch(`/api/videos/${video.id}/pin`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data) {
      setPinned(data.isPinned);
      toast("success", data.isPinned ? "Added to your featured posts" : "Removed from featured posts");
    } else {
      toast("error", data?.error || "You can only feature up to 3 posts");
    }
  }

  const isOwn = currentUser?.id === video.user.id;
  const watchStartRef = useRef<number>(0);
  const maxWatchedRef = useRef<number>(0);

  function recordView() {
    const watched = maxWatchedRef.current;
    if (watched < 1) return;
    fetch(`/api/videos/${video.id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchSeconds: Math.round(watched), completed: watched >= video.duration - 1 }),
      keepalive: true,
    }).catch(() => {});
    maxWatchedRef.current = 0;
  }

  useEffect(() => {
    if (isPhoto) {
      if (isActive) {
        watchStartRef.current = Date.now();
        maxWatchedRef.current = video.duration;
        audioRef.current?.play().catch(() => {});
      } else {
        audioRef.current?.pause();
        recordView();
      }
      return;
    }
    const el = videoRef.current;
    if (!el) return;
    if (isActive && !errored) {
      watchStartRef.current = Date.now();
      const p = el.play();
      if (p) p.catch(() => setPlaying(false));
      setPlaying(true);
    } else {
      el.pause();
      recordView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, errored]);

  useEffect(() => {
    return () => {
      if (isActive) recordView();
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    setMuted((m) => {
      const next = !m;
      localStorage.setItem("fliq_muted", next ? "1" : "0");
      return next;
    });
  }

  function handleTimeUpdate() {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    setProgress((el.currentTime / el.duration) * 100);
    maxWatchedRef.current = Math.max(maxWatchedRef.current, el.currentTime);
  }

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 500);
  }

  const requireAuth = useCallback(
    (action: () => void) => {
      if (!currentUser) {
        toast("info", "Log in to continue");
        router.push("/login");
        return;
      }
      action();
    },
    [currentUser, router]
  );

  function doLike() {
    requireAuth(() => {
      const next = !liked;
      setLiked(next);
      setLikeCount((c) => c + (next ? 1 : -1));
      fetch(`/api/videos/${video.id}/like`, { method: next ? "POST" : "DELETE" }).catch(() => {});
    });
  }

  function handleTap(e: React.MouseEvent | React.TouchEvent) {
    // A tap fires both `touchend` and a follow-up synthetic `click` on real
    // touchscreens; without this, one physical tap could be read as two taps
    // in quick succession and misfire as a double-tap like.
    e.preventDefault();

    const now = Date.now();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const point = "touches" in e ? e.changedTouches[0] : (e as React.MouseEvent);
    const tapX = point.clientX - rect.left;

    if (now - lastTapRef.current < 300) {
      // double tap → like
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      if (!liked) doLike();
      setHeartBurst({ x: tapX, y: point.clientY - rect.top, id: now });
      setTimeout(() => setHeartBurst(null), 900);
    } else {
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
        if (isPhoto) {
          if (tapX < rect.width / 2) setPhotoIndex((i) => Math.max(0, i - 1));
          else setPhotoIndex((i) => Math.min(video.photos.length - 1, i + 1));
        } else {
          togglePlay();
        }
      }, 300);
    }
  }

  function doSave() {
    requireAuth(() => {
      const next = !saved;
      setSaved(next);
      setSaveCount((c) => c + (next ? 1 : -1));
      fetch(`/api/videos/${video.id}/save`, { method: next ? "POST" : "DELETE" }).catch(() => {});
      toast("success", next ? "Saved to your profile" : "Removed from saved");
    });
  }

  function doRepost() {
    requireAuth(() => {
      if (!video.allowReuse) {
        toast("info", "The creator has turned off reposts for this video");
        return;
      }
      const next = !reposted;
      setReposted(next);
      setRepostCount((c) => c + (next ? 1 : -1));
      fetch(`/api/videos/${video.id}/repost`, { method: next ? "POST" : "DELETE" }).catch(() => {});
      toast("success", next ? "Reposted to your profile" : "Repost removed");
    });
  }

  function doFollow() {
    requireAuth(async () => {
      if (followStatus === "none") {
        if (!video.user.isPrivate) setFollowStatus("accepted");
        const res = await fetch(`/api/users/${video.user.username}/follow`, { method: "POST" }).catch(() => null);
        const data = await res?.json().catch(() => null);
        if (data?.status) setFollowStatus(data.status);
      } else {
        setFollowStatus("none");
        await fetch(`/api/users/${video.user.username}/follow`, { method: "DELETE" }).catch(() => {});
      }
    });
  }

  return (
    <div className="relative w-full h-full bg-black snap-item overflow-hidden">
      {isPhoto ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.photos[photoIndex] ?? video.thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onClick={handleTap}
            onTouchEnd={handleTap}
          />
          {video.sound && <audio ref={audioRef} src={video.sound.audioUrl} loop muted={muted} />}
        </>
      ) : !errored ? (
        <video
          ref={videoRef}
          src={video.videoUrl ?? undefined}
          poster={video.thumbnailUrl}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted={muted}
          playsInline
          preload={isActive || preload ? "auto" : "metadata"}
          onTimeUpdate={handleTimeUpdate}
          onError={() => setErrored(true)}
          onClick={handleTap}
          onTouchEnd={handleTap}
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundImage: `url(${video.thumbnailUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <ErrorState
              title="Couldn't load this video"
              description="Check your connection and try again."
              onRetry={() => setErrored(false)}
            />
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

      {!isPhoto && !playing && !errored && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Play size={64} className="text-white/90 drop-shadow-lg" fill="white" />
        </div>
      )}
      {showPlayIcon && playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-black/30 flex items-center justify-center" />
        </div>
      )}
      {heartBurst && (
        <Heart
          key={heartBurst.id}
          size={90}
          fill="#f43f5e"
          className="absolute text-danger pointer-events-none animate-heart-burst -translate-x-1/2 -translate-y-1/2"
          style={{ left: heartBurst.x, top: heartBurst.y }}
        />
      )}

      {!isPhoto && (
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 60px)" }}
          className="absolute right-3 z-20 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}

      {/* progress indicator */}
      {isPhoto ? (
        video.photos.length > 1 && (
          <div className="absolute top-2 inset-x-2 z-10 flex gap-1">
            {video.photos.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-white/25 overflow-hidden">
                <div className={cn("h-full bg-white", i <= photoIndex ? "w-full" : "w-0")} />
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-white/15 z-10">
          <div className="h-full bg-white transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* right action rail */}
      <div className="absolute right-2.5 bottom-24 md:bottom-6 z-10 flex flex-col items-center gap-5">
        <div className="relative">
          <Link href={`/profile/${video.user.username}`} onClick={(e) => e.stopPropagation()}>
            <Avatar src={video.user.avatarUrl} alt={video.user.displayName} size="lg" ring verified={video.user.isVerified} />
          </Link>
          {!isOwn && followStatus === "none" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                doFollow();
              }}
              aria-label="Follow"
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-fliq-magenta flex items-center justify-center text-white text-xs font-bold border-2 border-black"
            >
              +
            </button>
          )}
        </div>

        <ActionButton
          icon={Heart}
          active={liked}
          activeClass="fill-danger text-danger"
          count={likeCount}
          label={liked ? "Unlike" : "Like"}
          onClick={(e) => {
            e.stopPropagation();
            doLike();
          }}
        />
        <ActionButton
          icon={MessageCircle}
          count={commentCount}
          label="Comments"
          onClick={(e) => {
            e.stopPropagation();
            setCommentsOpen(true);
          }}
        />
        <ActionButton
          icon={Repeat2}
          active={reposted}
          activeClass="text-fliq-cyan"
          count={repostCount}
          label={reposted ? "Remove repost" : "Repost"}
          onClick={(e) => {
            e.stopPropagation();
            doRepost();
          }}
        />
        <ActionButton
          icon={Share2}
          count={shareCount}
          label="Share"
          onClick={(e) => {
            e.stopPropagation();
            setShareOpen(true);
          }}
        />
        <ActionButton
          icon={Bookmark}
          active={saved}
          activeClass="fill-warning text-warning"
          count={saveCount}
          label={saved ? "Unsave" : "Save"}
          onClick={(e) => {
            e.stopPropagation();
            doSave();
          }}
        />
        <ActionButton
          icon={MoreHorizontal}
          label="More"
          onClick={(e) => {
            e.stopPropagation();
            setMoreOpen(true);
          }}
        />
      </div>

      {/* bottom overlay */}
      <div className="absolute left-3 right-16 bottom-20 md:bottom-4 z-10 text-white pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          <Link href={`/profile/${video.user.username}`} className="font-semibold text-[15px] hover:underline" onClick={(e) => e.stopPropagation()}>
            @{video.user.username}
          </Link>
          {!isOwn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                doFollow();
              }}
              className={cn(
                "text-xs font-semibold px-2.5 py-1 rounded-full border",
                followStatus !== "none" ? "border-white/30 text-white/70" : "border-white text-white"
              )}
            >
              {followStatus === "accepted" ? "Following" : followStatus === "pending" ? "Requested" : "Follow"}
            </button>
          )}
        </div>
        <p className="text-sm mt-1.5 leading-snug pointer-events-auto line-clamp-3">
          <CaptionText text={video.caption} />
        </p>
        {video.duetOf && (
          <Link
            href={`/video/${video.duetOf.id}`}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto flex items-center gap-1.5 mt-1 text-xs text-white/90"
          >
            <SquareSplitHorizontal size={12} className="shrink-0" />
            Duet with @{video.duetOf.user.username}
          </Link>
        )}
        {video.stitchOf && (
          <Link
            href={`/video/${video.stitchOf.id}`}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto flex items-center gap-1.5 mt-1 text-xs text-white/90"
          >
            <Scissors size={12} className="shrink-0" />
            Stitch with @{video.stitchOf.user.username}
          </Link>
        )}
        {video.location && (
          <p className="flex items-center gap-1 text-xs text-white/80 mt-1">
            <MapPin size={12} /> {video.location}
          </p>
        )}
        {video.sound && (
          <Link
            href={`/sounds/${video.sound.id}`}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto flex items-center gap-1.5 mt-1.5 text-xs text-white/90"
          >
            {video.sound.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.sound.coverUrl}
                alt=""
                className="w-3.5 h-3.5 rounded-full object-cover shrink-0 animate-spin-record"
                style={{ animationPlayState: playing && isActive ? "running" : "paused" }}
              />
            ) : (
              <Music2 size={12} className="shrink-0" />
            )}
            <span className="truncate max-w-[220px]">
              {video.sound.isOriginal ? `original sound · ${video.sound.artist}` : `${video.sound.title} · ${video.sound.artist}`}
            </span>
          </Link>
        )}
      </div>

      <CommentsSheet
        videoId={video.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        isOwner={isOwn}
        allowComments={video.allowComments}
        onCountChange={(d) => setCommentCount((c) => c + d)}
      />
      <ShareSheet videoId={video.id} open={shareOpen} onClose={() => setShareOpen(false)} onShared={() => setShareCount((c) => c + 1)} />
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType="video" targetId={video.id} />

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        <div className="px-2 pb-3">
          {!isOwn && video.allowDuet && video.postType !== "photo" && (
            <MoreItem
              icon={SquareSplitHorizontal}
              label="Duet"
              onClick={() => {
                setMoreOpen(false);
                requireAuth(() => router.push(`/create/duet/${video.id}`));
              }}
            />
          )}
          {!isOwn && video.allowStitch && video.postType !== "photo" && (
            <MoreItem
              icon={Scissors}
              label="Stitch"
              onClick={() => {
                setMoreOpen(false);
                requireAuth(() => router.push(`/create/stitch/${video.id}`));
              }}
            />
          )}
          <MoreItem
            icon={EyeOff}
            label="Not interested"
            onClick={() => {
              setMoreOpen(false);
              fetch(`/api/videos/${video.id}/not-interested`, { method: "POST" }).catch(() => {});
              onNotInterested?.(video.id);
              toast("info", "We'll show you less content like this");
            }}
          />
          <MoreItem
            icon={Info}
            label="About this account"
            onClick={() => {
              setMoreOpen(false);
              router.push(`/profile/${video.user.username}`);
            }}
          />
          {isOwn && video.status === "published" && (
            <MoreItem icon={pinned ? PinOff : Pin} label={pinned ? "Unpin from profile" : "Pin to profile"} onClick={togglePin} />
          )}
          {!isOwn && (
            <MoreItem
              icon={Flag}
              label="Report"
              danger
              onClick={() => {
                setMoreOpen(false);
                setReportOpen(true);
              }}
            />
          )}
        </div>
      </Sheet>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  active,
  activeClass,
  count,
  label,
  onClick,
}: {
  icon: typeof Heart;
  active?: boolean;
  activeClass?: string;
  count?: number;
  label: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-1 group">
      <span className="w-11 h-11 rounded-full flex items-center justify-center bg-black/25 backdrop-blur-sm group-active:scale-90 transition-transform">
        <Icon size={25} className={cn("text-white", active && activeClass)} />
      </span>
      {count !== undefined && count > 0 && <span className="text-white text-xs font-medium drop-shadow">{formatCount(count)}</span>}
    </button>
  );
}

function MoreItem({ icon: Icon, label, onClick, danger }: { icon: typeof Flag; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn("w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left", danger ? "text-danger" : "text-white")}
    >
      <Icon size={19} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
