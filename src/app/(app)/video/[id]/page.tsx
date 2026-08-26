"use client";

import { useEffect, useMemo, useRef, useState, use as usePromise } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { VideoCard } from "@/components/feed/VideoCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { FeedItemSkeleton } from "@/components/ui/Skeleton";
import type { VideoDTO } from "@/types/models";

/**
 * Resolves the ordered list of videos the viewer was browsing before they
 * opened this one, from the query-string context left by the page they
 * came from (search, hashtag, sound, category, profile). Swiping here then
 * continues through that same set instead of jumping to unrelated content.
 * Falls back to null (single-video mode) when there's no context, the
 * context fails to resolve, or the current video isn't actually in it.
 */
async function resolveContextList(context: string | null, params: URLSearchParams, currentId: string): Promise<VideoDTO[] | null> {
  try {
    let list: VideoDTO[] | undefined;
    if (context === "search") {
      const q = params.get("q");
      const stype = params.get("stype") || "videos";
      if (!q) return null;
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${stype}`);
      if (!r.ok) return null;
      const d = await r.json();
      list = stype === "photos" ? d.photos : d.videos;
    } else if (context === "hashtag") {
      const tag = params.get("tag");
      if (!tag) return null;
      const r = await fetch(`/api/hashtags/${encodeURIComponent(tag)}?sort=${params.get("sort") || "top"}`);
      if (!r.ok) return null;
      list = (await r.json()).videos;
    } else if (context === "sound") {
      const soundId = params.get("soundId");
      if (!soundId) return null;
      const r = await fetch(`/api/sounds/${soundId}`);
      if (!r.ok) return null;
      list = (await r.json()).videos;
    } else if (context === "category") {
      const slug = params.get("slug");
      if (!slug) return null;
      const r = await fetch(`/api/discover/category/${slug}`);
      if (!r.ok) return null;
      list = (await r.json()).videos;
    } else if (context === "profile") {
      const username = params.get("username");
      if (!username) return null;
      const r = await fetch(`/api/users/${username}/videos?tab=${params.get("tab") || "videos"}`);
      if (!r.ok) return null;
      list = (await r.json()).videos;
    } else {
      return null;
    }
    if (!list || !list.some((v) => v.id === currentId)) return null;
    return list;
  } catch {
    return null;
  }
}

export default function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = searchParams.get("context");

  const [videos, setVideos] = useState<VideoDTO[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);

  function load() {
    setError(null);
    setVideos(null);
    setActiveIndex(0);
    (async () => {
      const list = await resolveContextList(context, new URLSearchParams(searchParamsString), id);
      if (list) {
        setVideos(list);
        setActiveIndex(Math.max(0, list.findIndex((v) => v.id === id)));
        return;
      }
      try {
        const r = await fetch(`/api/videos/${id}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Couldn't load this video");
        setVideos([data.video]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load this video");
      }
    })();
  }

  useEffect(load, [id, context, searchParamsString]);

  // Jump the scroll container to the starting video without an animated
  // scroll (the viewer opened this specific one, not the top of the list).
  useEffect(() => {
    if (!videos || videos.length < 2) return;
    const el = itemRefs.current[activeIndex];
    el?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !videos || videos.length < 2) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            setActiveIndex(Number((entry.target as HTMLElement).dataset.index));
          }
        });
      },
      { root: container, threshold: [0.6] }
    );

    itemRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [videos]);

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
      ) : !videos ? (
        <FeedItemSkeleton />
      ) : videos.length === 1 ? (
        <VideoCard video={videos[0]} isActive />
      ) : (
        <div ref={containerRef} className="h-full w-full overflow-y-scroll snap-y-feed no-scrollbar">
          {videos.map((video, i) => (
            <div
              key={video.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              data-index={i}
              className="h-[100dvh] w-full"
            >
              <VideoCard video={video} isActive={i === activeIndex} preload={i === activeIndex + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
