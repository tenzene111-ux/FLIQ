"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoDTO } from "@/types/models";

export function useFeed(tab: "foryou" | "following") {
  const [videos, setVideos] = useState<VideoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const fetchingRef = useRef(false);
  const seenIds = useRef<Set<string>>(new Set());

  const reset = useCallback(() => {
    setVideos([]);
    offsetRef.current = 0;
    seenIds.current = new Set();
    setHasMore(true);
    setEmpty(false);
  }, []);

  const load = useCallback(
    async (isInitial = false) => {
      if (fetchingRef.current || (!hasMore && !isInitial)) return;
      fetchingRef.current = true;
      if (isInitial) setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/videos/feed?tab=${tab}&offset=${offsetRef.current}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load feed");
        const data = await res.json();
        const fresh: VideoDTO[] = (data.videos || []).filter((v: VideoDTO) => !seenIds.current.has(v.id));
        fresh.forEach((v) => seenIds.current.add(v.id));
        setVideos((prev) => (isInitial ? fresh : [...prev, ...fresh]));
        setEmpty(!!data.empty && fresh.length === 0 && isInitial);
        if (data.nextOffset === null || data.nextOffset === undefined) {
          setHasMore(false);
        } else {
          offsetRef.current = data.nextOffset;
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    [tab, hasMore]
  );

  useEffect(() => {
    reset();
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return { videos, loading, error, empty, loadMore: () => load(false), reload: () => { reset(); load(true); } };
}
