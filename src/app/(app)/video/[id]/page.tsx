"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { VideoCard } from "@/components/feed/VideoCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { FeedItemSkeleton } from "@/components/ui/Skeleton";
import type { VideoDTO } from "@/types/models";

export default function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [video, setVideo] = useState<VideoDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setVideo(null);
    fetch(`/api/videos/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Couldn't load this video");
        return data;
      })
      .then((d) => setVideo(d.video))
      .catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <button
        onClick={() => router.back()}
        aria-label="Back"
        className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white safe-top"
      >
        <ArrowLeft size={20} />
      </button>

      {error ? (
        <div className="h-full flex items-center justify-center px-6">
          <ErrorState title="Couldn't load this video" description={error} onRetry={load} />
        </div>
      ) : !video ? (
        <FeedItemSkeleton />
      ) : (
        <VideoCard video={video} isActive />
      )}
    </div>
  );
}
