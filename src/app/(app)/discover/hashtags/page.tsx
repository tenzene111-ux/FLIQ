"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { formatCount } from "@/lib/utils";

interface HashtagRow {
  tag: string;
  viewCount: number;
  videoCount: number;
}

export default function AllHashtagsPage() {
  const router = useRouter();
  const [hashtags, setHashtags] = useState<HashtagRow[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    fetch("/api/hashtags")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setHashtags(d.hashtags))
      .catch(() => setError(true));
  }

  useEffect(load, []);

  return (
    <PageContainer className="max-w-2xl mx-auto w-full safe-top">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => router.back()} className="text-white" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-lg font-bold">Trending Hashtags</h1>
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : hashtags === null ? (
        Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)
      ) : hashtags.length === 0 ? (
        <EmptyState icon={Hash} title="No hashtags yet" />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {hashtags.map((h) => (
            <Link key={h.tag} href={`/discover/hashtag/${h.tag}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-brand-soft flex items-center justify-center text-fliq-cyan font-bold shrink-0">#</div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate">#{h.tag}</p>
                <p className="text-muted-2 text-xs">
                  {formatCount(h.viewCount)} views · {formatCount(h.videoCount)} videos
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
