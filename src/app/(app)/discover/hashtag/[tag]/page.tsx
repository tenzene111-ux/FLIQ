"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowLeft, Hash } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { VideoGrid } from "@/components/video/VideoGrid";
import { VideoGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCount, cn } from "@/lib/utils";
import type { VideoDTO } from "@/types/models";

export default function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = usePromise(params);
  const [sort, setSort] = useState<"top" | "recent">("top");
  const [info, setInfo] = useState<{ tag: string; viewCount: number; videoCount: number } | null>(null);
  const [videos, setVideos] = useState<VideoDTO[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    fetch(`/api/hashtags/${tag}?sort=${sort}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setInfo(d.hashtag);
        setVideos(d.videos);
      })
      .catch(() => setError(true));
  }

  useEffect(load, [tag, sort]);

  return (
    <PageContainer className="max-w-2xl mx-auto w-full safe-top">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <Link href="/discover" className="text-white" aria-label="Back">
          <ArrowLeft size={22} />
        </Link>
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : !info ? (
        <div className="px-4">
          <VideoGridSkeleton />
        </div>
      ) : (
        <>
          <div className="px-4 flex flex-col items-center text-center pb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-brand-diag flex items-center justify-center mb-3">
              <Hash size={30} className="text-white" />
            </div>
            <h1 className="text-white text-xl font-bold">#{info.tag}</h1>
            <p className="text-muted text-sm mt-1">{formatCount(info.viewCount)} views · {info.videoCount} videos</p>
          </div>

          <div className="flex items-center gap-6 px-4 border-b border-border mb-1">
            {(["top", "recent"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn("pb-3 text-sm font-semibold capitalize border-b-2 -mb-px", sort === s ? "text-white border-white" : "text-muted-2 border-transparent")}
              >
                {s}
              </button>
            ))}
          </div>

          {videos && videos.length === 0 ? (
            <EmptyState icon={Hash} title="No videos yet" description="Be the first to post with this hashtag." />
          ) : videos ? (
            <VideoGrid videos={videos} linkBuilder={(v) => `/video/${v.id}?context=hashtag&tag=${encodeURIComponent(tag)}&sort=${sort}`} />
          ) : (
            <VideoGridSkeleton />
          )}
        </>
      )}
    </PageContainer>
  );
}
