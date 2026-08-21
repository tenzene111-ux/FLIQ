"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Heart, MessageCircle, UserPlus, Share2, AtSign, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { formatTimeAgo, cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

type Tab = "all" | "likes" | "comments" | "followers" | "mentions";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "likes", label: "Likes" },
  { id: "comments", label: "Comments" },
  { id: "followers", label: "Followers" },
  { id: "mentions", label: "Mentions" },
];

interface NotificationItem {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  commentText: string | null;
  actor: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean } | null;
  video: { id: string; thumbnailUrl: string; caption: string } | null;
}

export default function ActivityPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState(false);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  function load() {
    setError(false);
    fetch(`/api/notifications?tab=${tab}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setItems(d.notifications))
      .catch(() => setError(true));
  }

  useEffect(load, [tab]);

  useEffect(() => {
    fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  }, []);

  async function followBack(username: string) {
    setFollowing((prev) => new Set(prev).add(username));
    await fetch(`/api/users/${username}/follow`, { method: "POST" }).catch(() => {});
  }

  function iconFor(type: string) {
    switch (type) {
      case "like":
        return Heart;
      case "comment":
        return MessageCircle;
      case "follow":
        return UserPlus;
      case "share":
        return Share2;
      case "mention":
        return AtSign;
      default:
        return Sparkles;
    }
  }

  function actionFor(n: NotificationItem) {
    switch (n.type) {
      case "like":
        return "liked your video.";
      case "comment":
        return `commented: ${n.commentText ?? ""}`;
      case "follow":
        return "started following you.";
      case "share":
        return "shared your video.";
      case "mention":
        return `mentioned you: ${n.commentText ?? ""}`;
      default:
        return null;
    }
  }

  function hrefFor(n: NotificationItem) {
    if (n.video) return `/video/${n.video.id}`;
    if (n.type === "follow" && n.actor) return `/profile/${n.actor.username}`;
    return "#";
  }

  return (
    <PageContainer className="max-w-2xl mx-auto w-full safe-top">
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-2xl font-bold text-white">Activity</h1>
      </div>

      <div className="flex items-center gap-5 px-4 border-b border-border overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn("pb-3 text-sm font-semibold shrink-0 border-b-2 -mb-px", tab === t.id ? "text-white border-white" : "text-muted-2 border-transparent")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : items === null ? (
        Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up." description="New activity will show up here." />
      ) : (
        <div className="flex flex-col">
          {items.map((n) => {
            const Icon = iconFor(n.type);
            const isFollowing = n.actor ? following.has(n.actor.username) : false;
            return (
              <Link key={n.id} href={hrefFor(n)} className={cn("flex items-center gap-3 px-4 py-3 hover:bg-white/5", !n.isRead && "bg-white/[0.03]")}>
                <div className="relative shrink-0">
                  {n.actor ? (
                    <Avatar src={n.actor.avatarUrl} alt={n.actor.displayName} size="md" verified={n.actor.isVerified} />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-gradient-brand-diag flex items-center justify-center">
                      <Sparkles size={18} className="text-white" />
                    </span>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface-2 border border-background flex items-center justify-center">
                    <Icon size={11} className={cn(n.type === "like" && "text-danger fill-danger", n.type === "follow" && "text-fliq-cyan", "text-white")} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-snug">
                    <span className="font-semibold">{n.actor?.displayName ?? "Fliq"}</span>{" "}
                    {actionFor(n) ?? "Welcome to Fliq! 🎉"}
                  </p>
                  <p className="text-muted-2 text-xs mt-0.5">{formatTimeAgo(n.createdAt)}</p>
                </div>
                {n.video && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.video.thumbnailUrl} alt="" className="w-10 h-12 rounded-md object-cover shrink-0" />
                )}
                {n.type === "follow" && n.actor && n.actor.id !== currentUser?.id && (
                  <Button
                    size="sm"
                    variant={isFollowing ? "secondary" : "primary"}
                    onClick={(e) => {
                      e.preventDefault();
                      followBack(n.actor!.username);
                    }}
                    className="shrink-0"
                  >
                    {isFollowing ? "Following" : "Follow back"}
                  </Button>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
