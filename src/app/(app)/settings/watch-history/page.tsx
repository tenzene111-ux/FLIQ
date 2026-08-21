"use client";

import { useEffect, useState } from "react";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { VideoGrid } from "@/components/video/VideoGrid";
import { VideoGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { History } from "lucide-react";
import type { VideoDTO } from "@/types/models";

export default function WatchHistoryPage() {
  const [videos, setVideos] = useState<VideoDTO[] | null>(null);

  useEffect(() => {
    fetch("/api/users/me/watch-history")
      .then((r) => r.json())
      .then((d) => setVideos(d.videos))
      .catch(() => setVideos([]));
  }, []);

  return (
    <SettingsSubpage title="Watch History">
      {videos === null ? (
        <VideoGridSkeleton />
      ) : videos.length === 0 ? (
        <EmptyState icon={History} title="No watch history yet" description="Videos you watch will show up here." />
      ) : (
        <VideoGrid videos={videos} />
      )}
    </SettingsSubpage>
  );
}
