"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { VideoGrid } from "@/components/video/VideoGrid";
import { VideoGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import type { VideoDTO } from "@/types/models";

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = usePromise(params);
  const [category, setCategory] = useState<{ slug: string; label: string; emoji: string } | null>(null);
  const [videos, setVideos] = useState<VideoDTO[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    fetch(`/api/discover/category/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setCategory(d.category);
        setVideos(d.videos);
      })
      .catch(() => setError(true));
  }

  useEffect(load, [slug]);

  return (
    <PageContainer className="max-w-2xl mx-auto w-full safe-top">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <Link href="/discover" className="text-white" aria-label="Back">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-white text-lg font-bold flex items-center gap-2">
          {category?.emoji} {category?.label ?? "Category"}
        </h1>
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : !videos ? (
        <div className="px-4">
          <VideoGridSkeleton />
        </div>
      ) : videos.length === 0 ? (
        <EmptyState icon={ArrowLeft} title="No videos yet" description="Nothing in this category yet — check back soon." />
      ) : (
        <VideoGrid videos={videos} linkBuilder={(v) => `/video/${v.id}?context=category&slug=${slug}`} />
      )}
    </PageContainer>
  );
}
