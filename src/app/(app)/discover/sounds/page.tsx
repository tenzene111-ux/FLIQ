"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Music2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { formatCount, formatDuration } from "@/lib/utils";

interface SoundRow {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number;
  isOriginal: boolean;
  videoCount: number;
}

export default function TrendingSoundsPage() {
  const router = useRouter();
  const [sounds, setSounds] = useState<SoundRow[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    fetch("/api/sounds")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setSounds(d.sounds))
      .catch(() => setError(true));
  }

  useEffect(load, []);

  return (
    <PageContainer className="max-w-2xl mx-auto w-full safe-top">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => router.back()} className="text-white" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-lg font-bold">Trending Sounds</h1>
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : sounds === null ? (
        Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)
      ) : sounds.length === 0 ? (
        <EmptyState icon={Music2} title="No sounds yet" />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {sounds.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/sounds/${s.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80">
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.coverUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate">{s.isOriginal ? `original sound · ${s.artist}` : s.title}</p>
                  <p className="text-muted-2 text-xs truncate">
                    {s.isOriginal ? formatDuration(s.duration) : s.artist} · {formatCount(s.videoCount)} videos
                  </p>
                </div>
              </Link>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => router.push(`/create/video?soundId=${s.id}&soundLabel=${encodeURIComponent(`${s.title} · ${s.artist}`)}`)}
              >
                Use
              </Button>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
