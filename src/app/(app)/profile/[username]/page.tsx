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
  Flag,
  BarChart3,
  FileEdit,
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
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState<Tab>("videos");
  const [videos, setVideos] = useState<VideoDTO[] | null>(null);
  const [error, setError] = useState(false);
  const [followSheet, setFollowSheet] = useState<"followers" | "following" | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);

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
        setFollowing(d.isFollowing);
      })
      .catch(() => setError(true));
  }

  useEffect(loadProfile, [username]);

  useEffect(() => {
    if (!user) return;
    setVideos(null);
    fetch(`/api/users/${username}/videos?tab=${tab}`)
      .then((r) => r.json())
      .then((d) => setVideos(d.videos || []))
      .catch(() => setVideos([]));
  }, [username, tab, user]);

  async function toggleFollow() {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    const next = !following;
    setFollowing(next);
    setStats((s) => (s ? { ...s, followers: s.followers + (next ? 1 : -1) } : s));
    await fetch(`/api/users/${username}/follow`, { method: next ? "POST" : "DELETE" }).catch(() => {});
  }

  async function handleMessage() {
    const res = await fetch(`/api/conversations/with/${username}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) router.push(`/inbox/${data.conversationId}`);
    else toast("error", data.error || "Couldn't start conversation");
  }

  async function shareProfile() {
    const url = `${window.location.origin}/profile/${username}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("success", "Profile link copied");
    } catch {
      toast("info", url);
    }
  }

  async function toggleBlock() {
    setMoreOpen(false);
    const next = !blocked;
    setBlocked(next);
    await fetch(`/api/users/${username}/block`, { method: next ? "POST" : "DELETE" }).catch(() => {});
    toast("success", next ? `Blocked @${username}` : `Unblocked @${username}`);
    if (next) setFollowing(false);
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
              <button onClick={shareProfile} className="text-white" aria-label="Share profile">
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
            <Avatar src={user.avatarUrl} alt={user.displayName} size="2xl" ring verified={user.isVerified} />
            <h1 className="text-white text-xl font-bold mt-3">{user.displayName}</h1>
            <p className="text-muted text-sm">@{user.username}</p>

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
                  <Button variant="secondary" onClick={shareProfile} aria-label="Share profile">
                    <Share2 size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant={following ? "secondary" : "primary"} className="flex-1" onClick={toggleFollow}>
                    {following ? "Following" : "Follow"}
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
                onClick={() => setTab(t.id)}
                className={cn("flex-1 flex items-center justify-center py-3 border-b-2", tab === t.id ? "border-white text-white" : "border-transparent text-muted-2")}
                aria-label={t.label}
              >
                <t.icon size={20} />
              </button>
            ))}
          </div>

          {user.isPrivate && !user.isOwn && !following ? (
            <EmptyState icon={Lock} title="This account is private" description={`Follow @${user.username} to see their videos.`} />
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
            />
          )}
        </>
      )}

      {user && (
        <>
          <FollowListSheet open={followSheet === "followers"} onClose={() => setFollowSheet(null)} username={username} type="followers" title="Followers" />
          <FollowListSheet open={followSheet === "following"} onClose={() => setFollowSheet(null)} username={username} type="following" title="Following" />
          <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={user.id} />
          <Sheet open={moreOpen} onClose={() => setMoreOpen(false)}>
            <div className="px-2 pb-3">
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
