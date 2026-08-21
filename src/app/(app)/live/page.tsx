"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Video as VideoIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCount } from "@/lib/utils";

interface LiveStreamRow {
  id: string;
  title: string;
  category: string;
  viewerCount: number;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
}

export default function LivePage() {
  const [streams, setStreams] = useState<LiveStreamRow[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    fetch("/api/live")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setStreams(d.streams))
      .catch(() => setError(true));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

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

      {error ? (
        <ErrorState onRetry={load} />
      ) : streams === null ? (
        <div className="grid grid-cols-2 gap-3 px-4">
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
        <div className="grid grid-cols-2 gap-3 px-4">
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
      )}
    </PageContainer>
  );
}
