"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Radio, Video as VideoIcon, CalendarClock } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCount, cn } from "@/lib/utils";

interface LiveStreamRow {
  id: string;
  title: string;
  category: string;
  viewerCount: number;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
}

interface ScheduledStreamRow {
  id: string;
  title: string;
  category: string;
  scheduledFor: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
}

function LivePageInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"live" | "scheduled">(searchParams.get("tab") === "scheduled" ? "scheduled" : "live");
  const [streams, setStreams] = useState<LiveStreamRow[] | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledStreamRow[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    if (tab === "live") {
      fetch("/api/live")
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((d) => setStreams(d.streams))
        .catch(() => setError(true));
    } else {
      fetch("/api/live?status=scheduled")
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((d) => setScheduled(d.streams))
        .catch(() => setError(true));
    }
  }

  useEffect(() => {
    load();
    const interval = tab === "live" ? setInterval(load, 10000) : undefined;
    return () => interval && clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <PageContainer className="max-w-2xl mx-auto w-full safe-top">
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Radio size={22} className="text-danger" /> Live
        </h1>
        <Link href="/live/start">
          <Button size="sm">Go Live</Button>
        </Link>
      </div>

      <div className="flex items-center gap-5 px-4 border-b border-border">
        <button
          onClick={() => setTab("live")}
          className={cn("pb-3 text-sm font-semibold border-b-2 -mb-px", tab === "live" ? "text-white border-white" : "text-muted-2 border-transparent")}
        >
          Live Now
        </button>
        <button
          onClick={() => setTab("scheduled")}
          className={cn("pb-3 text-sm font-semibold border-b-2 -mb-px", tab === "scheduled" ? "text-white border-white" : "text-muted-2 border-transparent")}
        >
          Scheduled
        </button>
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : tab === "live" ? (
        streams === null ? (
          <div className="grid grid-cols-2 gap-3 px-4 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[9/13] rounded-xl" />
            ))}
          </div>
        ) : streams.length === 0 ? (
          <EmptyState
            icon={VideoIcon}
            title="No one is live right now"
            description="Be the first to go live and connect with your audience."
            action={
              <Link href="/live/start">
                <Button size="sm">Go Live</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 pt-4">
            {streams.map((s) => (
              <Link key={s.id} href={`/live/${s.id}`} className="relative aspect-[9/13] rounded-xl overflow-hidden bg-gradient-brand-diag">
                <div className="absolute inset-0 bg-black/30" />
                <span className="absolute top-2 left-2 bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                </span>
                <span className="absolute top-2 right-2 bg-black/40 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  {formatCount(s.viewerCount)} watching
                </span>
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                  <Avatar src={s.user.avatarUrl} alt={s.user.displayName} size="xs" ring />
                  <div className="min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{s.user.username}</p>
                    <p className="text-white/70 text-[10px] truncate">{s.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : scheduled === null ? (
        <div className="flex flex-col gap-2 px-4 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : scheduled.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No upcoming lives" description="Scheduled livestreams from creators will show up here." />
      ) : (
        <div className="flex flex-col px-4 pt-3 gap-2">
          {scheduled.map((s) => (
            <Link key={s.id} href={`/profile/${s.user.username}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-3">
              <Avatar src={s.user.avatarUrl} alt={s.user.displayName} size="md" verified={s.user.isVerified} />
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate">{s.title}</p>
                <p className="text-muted-2 text-xs truncate">
                  @{s.user.username} ·{" "}
                  {new Date(s.scheduledFor).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default function LivePage() {
  return (
    <Suspense>
      <LivePageInner />
    </Suspense>
  );
}
