"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Settings,
  Share2,
  MoreHorizontal,
  MapPin,
  Link as LinkIcon,
  Video,
  Repeat2,
  Heart,
  Bookmark,
  Lock,
  UserX,
  VolumeX,
  Volume2,
  ShieldAlert,
  ShieldOff,
  Flag,
  BarChart3,
  FileEdit,
  Folder,
  Plus,
  Radio,
  CalendarClock,
  Bell,
  BellOff,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { VideoGrid } from "@/components/video/VideoGrid";
import { VideoGridSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FollowListSheet } from "@/components/creator/FollowListSheet";
import { ReportSheet } from "@/components/moderation/ReportSheet";
import { Sheet } from "@/components/ui/Sheet";
import { ShareMenuSheet } from "@/components/share/ShareMenuSheet";
import { CollectionPickerSheet, type CollectionSummary } from "@/components/creator/CollectionPickerSheet";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { formatCount, cn } from "@/lib/utils";
import type { VideoDTO } from "@/types/models";

type Tab = "videos" | "reposts" | "liked" | "saved" | "drafts";

interface ProfileUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  website: string | null;
  location: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  isOwn: boolean;
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = usePromise(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<{ followers: number; following: number; likes: number } | null>(null);
  const [followStatus, setFollowStatus] = useState<"none" | "pending" | "accepted">("none");
  const [tab, setTab] = useState<Tab>("videos");
  const [videos, setVideos] = useState<VideoDTO[] | null>(null);
  const [error, setError] = useState(false);
  const [followSheet, setFollowSheet] = useState<"followers" | "following" | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [collections, setCollections] = useState<CollectionSummary[] | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [pickerVideoId, setPickerVideoId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [scheduledLive, setScheduledLive] = useState<{ id: string; title: string; scheduledFor: string } | null>(null);
  const [reminding, setReminding] = useState(false);

  function loadProfile() {
    setError(false);
    fetch(`/api/users/${username}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setUser(d.user);
        setStats(d.stats);
        setFollowStatus(d.followStatus);
        setLiveId(d.liveId);
        setScheduledLive(d.scheduledLive);
      })
      .catch(() => setError(true));
  }

  async function toggleReminder() {
    if (!scheduledLive) return;
    const next = !reminding;
    setReminding(next);
    await fetch(`/api/live/${scheduledLive.id}/remind`, { method: next ? "POST" : "DELETE" }).catch(() => {});
    toast("success", next ? "We'll remind you when it starts" : "Reminder removed");
  }

  useEffect(loadProfile, [username]);

  useEffect(() => {
    if (!user) return;
    setVideos(null);
    if (tab === "saved" && activeCollection) {
      fetch(`/api/collections/${activeCollection}`)
        .then((r) => r.json())
        .then((d) => setVideos(d.videos || []))
        .catch(() => setVideos([]));
      return;
    }
    fetch(`/api/users/${username}/videos?tab=${tab}`)
      .then((r) => r.json())
      .then((d) => setVideos(d.videos || []))
      .catch(() => setVideos([]));
  }, [username, tab, user, activeCollection]);

  useEffect(() => {
    if (!user?.isOwn || tab !== "saved" || collections) return;
    fetch("/api/collections")
      .then((r) => r.json())
      .then((d) => setCollections(d.collections || []))
      .catch(() => setCollections([]));
  }, [user, tab, collections]);

  function selectTab(next: Tab) {
    if (next !== "saved") setActiveCollection(null);
    setTab(next);
  }

  async function deleteActiveCollection() {
    if (!activeCollection) return;
    const collection = collections?.find((c) => c.id === activeCollection);
    if (!confirm(`Delete "${collection?.name ?? "this collection"}"? Saved posts won't be removed from your account.`)) return;
    await fetch(`/api/collections/${activeCollection}`, { method: "DELETE" }).catch(() => {});
    setCollections((prev) => prev?.filter((c) => c.id !== activeCollection) ?? null);
    setActiveCollection(null);
  }

  async function createCollectionInline(name: string) {
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data) {
      setCollections((prev) => [...(prev ?? []), data.collection]);
      setActiveCollection(data.collection.id);
    } else {
      toast("error", data?.error || "Couldn't create collection");
    }
  }

  async function toggleFollow() {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (followStatus === "none") {
      // Optimistic only for public accounts — a private account needs the
      // server's answer since it might become "pending" instead of "accepted".
      if (!user?.isPrivate) {
        setFollowStatus("accepted");
        setStats((s) => (s ? { ...s, followers: s.followers + 1 } : s));
      }
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (data?.status) {
        setFollowStatus(data.status);
        if (data.stats) setStats(data.stats);
      }
    } else {
      const wasAccepted = followStatus === "accepted";
      setFollowStatus("none");
      if (wasAccepted) setStats((s) => (s ? { ...s, followers: Math.max(0, s.followers - 1) } : s));
      await fetch(`/api/users/${username}/follow`, { method: "DELETE" }).catch(() => {});
    }
  }

  async function handleMessage() {
    const res = await fetch(`/api/conversations/with/${username}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) router.push(`/inbox/${data.conversationId}`);
    else toast("error", data.error || "Couldn't start conversation");
  }

  async function toggleBlock() {
    setMoreOpen(false);
    const next = !blocked;
    setBlocked(next);
    await fetch(`/api/users/${username}/block`, { method: next ? "POST" : "DELETE" }).catch(() => {});
    toast("success", next ? `Blocked @${username}` : `Unblocked @${username}`);
    if (next) setFollowStatus("none");
  }

  async function toggleMute() {
    const next = !muted;
    setMuted(next);
    await fetch(`/api/users/${username}/mute`, { method: next ? "POST" : "DELETE" }).catch(() => {});
    toast("success", next ? `Muted @${username}` : `Unmuted @${username}`);
  }

  async function toggleRestrict() {
    const next = !restricted;
    setRestricted(next);
    await fetch(`/api/users/${username}/restrict`, { method: next ? "POST" : "DELETE" }).catch(() => {});
    toast("success", next ? `Restricted @${username}` : `Unrestricted @${username}`);
  }

  if (error) {
    return (
      <PageContainer className="max-w-2xl mx-auto w-full safe-top">
        <ErrorState onRetry={loadProfile} title="Couldn't load this profile" />
      </PageContainer>
    );
  }

  const tabs: { id: Tab; icon: typeof Video; label: string }[] = [
    { id: "videos", icon: Video, label: "Videos" },
    { id: "reposts", icon: Repeat2, label: "Reposts" },
    ...(user?.isOwn
      ? ([
          { id: "liked", icon: Heart, label: "Liked" },
          { id: "saved", icon: Bookmark, label: "Saved" },
          { id: "drafts", icon: FileEdit, label: "Drafts" },
        ] as const)
      : []),
  ];

  return (
    <PageContainer className="max-w-2xl mx-auto w-full safe-top">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => router.back()} className="text-white md:hidden" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <span className="flex-1 md:hidden" />
        <div className="flex items-center gap-4">
          {user?.isOwn ? (
            <>
              {currentUser?.isAdmin && (
                <Link href="/analytics" className="text-white" aria-label="Analytics">
                  <BarChart3 size={20} />
                </Link>
              )}
              <Link href="/settings" className="text-white" aria-label="Settings">
                <Settings size={22} />
              </Link>
            </>
          ) : (
            <>
              <button onClick={() => setShareOpen(true)} className="text-white" aria-label="Share profile">
                <Share2 size={20} />
              </button>
              <button onClick={() => setMoreOpen(true)} className="text-white" aria-label="More options">
                <MoreHorizontal size={22} />
              </button>
            </>
          )}
        </div>
      </div>

      {!user ? (
        <ProfileSkeleton />
      ) : (
        <>
          <div className="flex flex-col items-center px-4 text-center">
            {liveId ? (
              <Link href={`/live/${liveId}`} className="relative">
                <span className="absolute inset-0 rounded-full ring-2 ring-danger animate-pulse" />
                <Avatar src={user.avatarUrl} alt={user.displayName} size="2xl" verified={user.isVerified} />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                  <Radio size={9} /> LIVE
                </span>
              </Link>
            ) : (
              <Avatar src={user.avatarUrl} alt={user.displayName} size="2xl" ring verified={user.isVerified} />
            )}
            <h1 className="text-white text-xl font-bold mt-3">{user.displayName}</h1>
            <p className="text-muted text-sm">@{user.username}</p>
            {scheduledLive && (
              <div className="mt-3 w-full max-w-xs rounded-xl border border-border bg-surface-2 px-3 py-2.5 flex items-center gap-2.5 text-left">
                <span className="w-8 h-8 rounded-full bg-fliq-magenta/15 flex items-center justify-center shrink-0">
                  <CalendarClock size={15} className="text-fliq-magenta" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">{scheduledLive.title}</p>
                  <p className="text-muted-2 text-[11px]">
                    {new Date(scheduledLive.scheduledFor).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                {!user.isOwn && (
                  <button
                    onClick={toggleReminder}
                    aria-label={reminding ? "Remove reminder" : "Remind me"}
                    className="shrink-0 w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-white"
                  >
                    {reminding ? <BellOff size={14} /> : <Bell size={14} />}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-6 mt-4">
              <button onClick={() => setFollowSheet("following")} className="text-center">
                <p className="text-white font-bold">{formatCount(stats?.following ?? 0)}</p>
                <p className="text-muted-2 text-xs">Following</p>
              </button>
              <button onClick={() => setFollowSheet("followers")} className="text-center">
                <p className="text-white font-bold">{formatCount(stats?.followers ?? 0)}</p>
                <p className="text-muted-2 text-xs">Followers</p>
              </button>
              <div className="text-center">
                <p className="text-white font-bold">{formatCount(stats?.likes ?? 0)}</p>
                <p className="text-muted-2 text-xs">Likes</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 w-full max-w-xs">
              {user.isOwn ? (
                <>
                  <Link href="/profile/edit" className="flex-1">
                    <Button variant="secondary" fullWidth>
                      Edit Profile
                    </Button>
                  </Link>
                  <Button variant="secondary" onClick={() => setShareOpen(true)} aria-label="Share profile">
                    <Share2 size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant={followStatus === "none" ? "primary" : "secondary"} className="flex-1" onClick={toggleFollow}>
                    {followStatus === "accepted" ? "Following" : followStatus === "pending" ? "Requested" : "Follow"}
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={handleMessage}>
                    Message
                  </Button>
                </>
              )}
            </div>

            {user.bio && <p className="text-white/90 text-sm mt-4 whitespace-pre-line max-w-sm">{user.bio}</p>}
            <div className="flex flex-col items-center gap-1 mt-2">
              {user.location && (
                <span className="flex items-center gap-1 text-muted text-xs">
                  <MapPin size={12} /> {user.location}
                </span>
              )}
              {user.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-fliq-cyan text-xs">
                  <LinkIcon size={12} /> {user.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center justify-around border-b border-border mt-6 sticky top-0 bg-background z-[5]">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTab(t.id)}
                className={cn("flex-1 flex items-center justify-center py-3 border-b-2", tab === t.id ? "border-white text-white" : "border-transparent text-muted-2")}
                aria-label={t.label}
              >
                <t.icon size={20} />
              </button>
            ))}
          </div>

          {tab === "saved" && user.isOwn && (
            <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
              <button
                onClick={() => setActiveCollection(null)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border",
                  !activeCollection ? "bg-white text-black border-white" : "border-border text-muted-2"
                )}
              >
                All saved
              </button>
              {(collections ?? []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCollection(c.id)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5",
                    activeCollection === c.id ? "bg-white text-black border-white" : "border-border text-muted-2"
                  )}
                >
                  <Folder size={12} />
                  {c.name} · {c.count}
                </button>
              ))}
              {activeCollection && (
                <button onClick={deleteActiveCollection} className="shrink-0 text-danger text-xs font-medium px-1">
                  Delete
                </button>
              )}
              {newCollectionName === null ? (
                <button
                  onClick={() => setNewCollectionName("")}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border-strong text-muted-2 flex items-center gap-1"
                >
                  <Plus size={12} /> New
                </button>
              ) : (
                <span className="shrink-0 flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && newCollectionName.trim()) {
                        await createCollectionInline(newCollectionName.trim());
                        setNewCollectionName(null);
                      } else if (e.key === "Escape") setNewCollectionName(null);
                    }}
                    placeholder="Collection name"
                    maxLength={40}
                    className="w-32 bg-surface-2 border border-border rounded-full px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <button
                    onClick={async () => {
                      if (newCollectionName.trim()) await createCollectionInline(newCollectionName.trim());
                      setNewCollectionName(null);
                    }}
                    className="text-xs font-semibold text-fliq-cyan px-1"
                  >
                    Add
                  </button>
                </span>
              )}
            </div>
          )}

          {user.isPrivate && !user.isOwn && followStatus !== "accepted" ? (
            <EmptyState
              icon={Lock}
              title={followStatus === "pending" ? "Follow request pending" : "This account is private"}
              description={followStatus === "pending" ? "You'll see their posts once they approve your request." : `Follow @${user.username} to see their videos.`}
            />
          ) : videos === null ? (
            <VideoGridSkeleton />
          ) : videos.length === 0 ? (
            <EmptyState
              icon={tab === "videos" ? Video : tab === "reposts" ? Repeat2 : tab === "liked" ? Heart : tab === "drafts" ? FileEdit : Bookmark}
              title={
                tab === "videos"
                  ? user.isOwn
                    ? "Share your first video"
                    : "No videos yet"
                  : tab === "reposts"
                    ? "No reposts yet"
                    : tab === "liked"
                      ? "No liked videos yet"
                      : tab === "drafts"
                        ? "Drafts you save while creating will show up here"
                        : "Save videos you love and find them here."
              }
            />
          ) : (
            <VideoGrid
              videos={videos}
              linkBuilder={
                tab === "drafts" ? (v) => `/create/post?draftId=${v.id}` : (v) => `/video/${v.id}?context=profile&username=${username}&tab=${tab}`
              }
              onItemMenu={tab === "saved" && user.isOwn ? (v) => setPickerVideoId(v.id) : undefined}
            />
          )}
        </>
      )}

      {user && (
        <>
          <FollowListSheet open={followSheet === "followers"} onClose={() => setFollowSheet(null)} username={username} type="followers" title="Followers" isOwnProfile={user.isOwn} />
          {pickerVideoId && (
            <CollectionPickerSheet
              open={!!pickerVideoId}
              onClose={() => setPickerVideoId(null)}
              videoId={pickerVideoId}
              collections={collections ?? []}
              onCollectionsChange={setCollections}
            />
          )}
          <FollowListSheet open={followSheet === "following"} onClose={() => setFollowSheet(null)} username={username} type="following" title="Following" />
          <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={user.id} />
          <ShareMenuSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            kind="profile"
            id={user.id}
            url={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/${username}`}
            title="Share profile"
          />
          <Sheet open={moreOpen} onClose={() => setMoreOpen(false)}>
            <div className="px-2 pb-3">
              <button onClick={toggleMute} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left text-white">
                {muted ? <Volume2 size={19} /> : <VolumeX size={19} />}
                <span className="text-sm font-medium">{muted ? "Unmute" : "Mute"} @{user.username}</span>
              </button>
              <button onClick={toggleRestrict} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left text-white">
                {restricted ? <ShieldOff size={19} /> : <ShieldAlert size={19} />}
                <span className="text-sm font-medium">{restricted ? "Unrestrict" : "Restrict"} @{user.username}</span>
              </button>
              <button onClick={toggleBlock} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left text-white">
                <UserX size={19} /> <span className="text-sm font-medium">{blocked ? "Unblock" : "Block"} @{user.username}</span>
              </button>
              <button
                onClick={() => {
                  setMoreOpen(false);
                  setReportOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left text-danger"
              >
                <Flag size={19} /> <span className="text-sm font-medium">Report</span>
              </button>
            </div>
          </Sheet>
        </>
      )}
    </PageContainer>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center px-4 gap-3">
      <Skeleton className="w-24 h-24 rounded-full" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-full max-w-xs rounded-xl mt-3" />
      <VideoGridSkeleton />
    </div>
  );
}
