"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Music2, Bookmark, Share2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { VideoGrid } from "@/components/video/VideoGrid";
import { VideoGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ShareMenuSheet } from "@/components/share/ShareMenuSheet";
import { formatCount, formatDuration } from "@/lib/utils";
import { toast } from "@/store/toast";
import type { VideoDTO } from "@/types/models";

interface SoundDetail {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number;
  isOriginal: boolean;
  videoCount: number;
  owner: { username: string; displayName: string } | null;
}

export default function SoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [sound, setSound] = useState<SoundDetail | null>(null);
  const [videos, setVideos] = useState<VideoDTO[] | null>(null);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  function load() {
    setError(false);
    fetch(`/api/sounds/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setSound(d.sound);
        setVideos(d.videos);
      })
      .catch(() => setError(true));
  }

  useEffect(load, [id]);

  function useSound() {
    if (!sound) return;
    router.push(`/create/video?soundId=${sound.id}&soundLabel=${encodeURIComponent(`${sound.title} · ${sound.artist}`)}`);
  }

  if (error) {
    return (
      <PageContainer className="max-w-2xl mx-auto w-full safe-top">
        <ErrorState onRetry={load} title="Couldn't load this sound" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-2xl mx-auto w-full safe-top">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={() => router.back()} className="text-white" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
      </div>

      {!sound ? (
        <div className="px-4">
          <VideoGridSkeleton />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 px-4 pb-5">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sound.coverUrl} alt="" className="w-full h-full object-cover animate-spin-record" style={{ animationPlayState: "paused" }} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-white font-bold text-lg truncate">{sound.title}</h1>
              <p className="text-muted text-sm truncate">{sound.artist}</p>
              <p className="text-muted-2 text-xs mt-1">
                {formatDuration(sound.duration)} · {formatCount(sound.videoCount)} videos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 pb-5">
            <Button className="flex-1" onClick={useSound}>
              <Music2 size={15} /> Use Sound
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSaved((v) => !v);
                toast("success", saved ? "Removed from saved sounds" : "Sound saved");
              }}
            >
              <Bookmark size={15} className={saved ? "fill-white" : undefined} />
            </Button>
            <Button variant="secondary" onClick={() => setShareOpen(true)}>
              <Share2 size={15} />
            </Button>
          </div>

          <div className="px-4 pb-2">
            <p className="text-white text-sm font-semibold">Videos using this sound</p>
          </div>

          {videos === null ? (
            <VideoGridSkeleton />
          ) : videos.length === 0 ? (
            <EmptyState icon={Music2} title="No videos yet" description="Be the first to use this sound." />
          ) : (
            <VideoGrid videos={videos} linkBuilder={(v) => `/video/${v.id}?context=sound&soundId=${id}`} />
          )}
        </>
      )}
      <ShareMenuSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        kind="sound"
        id={id}
        url={`${typeof window !== "undefined" ? window.location.origin : ""}/sounds/${id}`}
        title="Share sound"
      />
    </PageContainer>
  );
}
