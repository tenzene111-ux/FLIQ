"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, UserPlus } from "lucide-react";
import { FliqMark } from "@/components/ui/FliqLogo";
import { VideoCard } from "@/components/feed/VideoCard";
import { FeedItemSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserRow, type UserRowData } from "@/components/creator/UserRow";
import { RightRail } from "@/components/layout/RightRail";
import { useFeed } from "@/hooks/useFeed";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { cn } from "@/lib/utils";

export function FeedShell() {
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const { videos, loading, error, empty, loadMore, reload } = useFeed(tab);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { notifications } = useUnreadCounts();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(idx);
            if (idx >= videos.length - 2) loadMore();
          }
        });
      },
      { root: container, threshold: [0.6] }
    );

    itemRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.length]);

  return (
    <div className="relative w-full h-[100dvh] bg-background overflow-hidden flex justify-center">
      <div className="relative h-full w-full xl:max-w-[480px] bg-black">
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),14px)] pb-3 pointer-events-none bg-gradient-to-b from-black/60 to-transparent">
        <Link href="/home" className="pointer-events-auto md:hidden">
          <FliqMark size={26} />
        </Link>
        <div className="flex-1 flex items-center justify-center gap-5 pointer-events-auto">
          <TabButton label="For You" active={tab === "foryou"} onClick={() => setTab("foryou")} />
          <TabButton label="Following" active={tab === "following"} onClick={() => setTab("following")} />
        </div>
        <Link href="/activity" className="pointer-events-auto relative w-8 h-8 flex items-center justify-center text-white" aria-label="Activity">
          <Bell size={22} />
          {notifications > 0 && (
            <span className="absolute top-0 right-0 min-w-[15px] h-[15px] px-0.5 rounded-full bg-danger text-[9px] font-bold text-white flex items-center justify-center">
              {notifications > 99 ? "99+" : notifications}
            </span>
          )}
        </Link>
      </div>

      {loading ? (
        <FeedItemSkeleton />
      ) : error && videos.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <ErrorState onRetry={reload} />
        </div>
      ) : empty && tab === "following" ? (
        <FollowingEmptyState onFollowed={reload} />
      ) : videos.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <EmptyState icon={Bell} title="No videos yet" description="Check back soon for new content." />
        </div>
      ) : (
        <div ref={containerRef} className="h-full w-full overflow-y-scroll snap-y-feed no-scrollbar">
          {videos.map((v, i) => (
            <div
              key={v.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              data-index={i}
              className="h-[100dvh] w-full"
            >
              <VideoCard video={v} isActive={i === activeIndex} />
            </div>
          ))}
        </div>
      )}
      </div>
      <RightRail />
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <span className={cn("text-[15px] font-semibold transition-colors", active ? "text-white" : "text-white/55")}>{label}</span>
      <span className={cn("h-0.5 w-5 rounded-full transition-colors", active ? "bg-white" : "bg-transparent")} />
    </button>
  );
}

function FollowingEmptyState({ onFollowed }: { onFollowed: () => void }) {
  const [users, setUsers] = useState<(UserRowData & { followerCount: number })[] | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/users/suggested")
      .then((r) => r.json())
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]));
  }, []);

  async function toggleFollow(username: string) {
    const isF = following.has(username);
    setFollowing((prev) => {
      const next = new Set(prev);
      isF ? next.delete(username) : next.add(username);
      return next;
    });
    await fetch(`/api/users/${username}/follow`, { method: isF ? "DELETE" : "POST" }).catch(() => {});
    if (!isF) onFollowed();
  }

  return (
    <div className="h-full w-full bg-background flex flex-col items-center justify-center px-6 pt-16">
      <EmptyState
        icon={UserPlus}
        title="Follow creators to build your personalized feed."
        description="Videos from people you follow will show up here."
        className="py-6"
      />
      <div className="w-full max-w-sm rounded-2xl border border-border divide-y divide-border overflow-hidden mt-2 max-h-[50vh] overflow-y-auto">
        {users === null && <div className="p-4 text-center text-muted text-sm">Loading suggestions...</div>}
        {users?.map((u) => (
          <UserRow key={u.id} user={u} following={following.has(u.username)} onToggleFollow={() => toggleFollow(u.username)} />
        ))}
      </div>
    </div>
  );
}
