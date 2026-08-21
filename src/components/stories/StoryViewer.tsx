"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatTimeAgo, cn } from "@/lib/utils";
import type { StoryGroup } from "@/components/stories/StoryTray";

const DURATION_MS = 5000;

export function StoryViewer({
  groups,
  startIndex,
  onClose,
  onViewed,
}: {
  groups: StoryGroup[];
  startIndex: number;
  onClose: () => void;
  onViewed: () => void;
}) {
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const raf = useRef<number | null>(null);
  const startedAt = useRef<number>(0);
  const elapsedAtPause = useRef(0);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  useEffect(() => {
    if (!story) return;
    fetch(`/api/stories/${story.id}/view`, { method: "POST" }).then(onViewed).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  useEffect(() => {
    setProgress(0);
    elapsedAtPause.current = 0;
    startedAt.current = performance.now();

    function tick(now: number) {
      if (!paused) {
        const elapsed = elapsedAtPause.current + (now - startedAt.current);
        const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
        setProgress(pct);
        if (pct >= 100) {
          next();
          return;
        }
      } else {
        startedAt.current = now;
      }
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, paused]);

  function next() {
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }

  function prev() {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((i) => i - 1);
      setStoryIndex(groups[groupIndex - 1].stories.length - 1);
    }
  }

  if (typeof document === "undefined" || !story) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] bg-black flex items-center justify-center">
      <div className="relative w-full h-full max-w-[480px] mx-auto">
        {story.mediaType === "video" ? (
          <video
            key={story.id}
            src={story.mediaUrl}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            onEnded={next}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={story.id} src={story.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/40" />

        <div className="absolute top-3 inset-x-3 flex gap-1.5 z-10">
          {group.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-7 inset-x-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Avatar src={group.user.avatarUrl} alt={group.user.displayName} size="sm" verified={group.user.isVerified} />
            <div>
              <p className="text-white text-sm font-semibold">{group.user.username}</p>
              <p className="text-white/70 text-xs">{formatTimeAgo(story.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white p-1">
            <X size={22} />
          </button>
        </div>

        {story.text && (
          <div className="absolute bottom-16 inset-x-4 z-10">
            <p className="text-white text-base font-medium text-center bg-black/30 rounded-xl px-4 py-2.5">{story.text}</p>
          </div>
        )}

        <button
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onClick={prev}
          aria-label="Previous story"
          className="absolute left-0 top-0 bottom-0 w-1/3 z-[5] flex items-center justify-start pl-2"
        >
          <ChevronLeft size={22} className={cn("text-white/0", groupIndex === 0 && storyIndex === 0 && "hidden")} />
        </button>
        <button
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onClick={next}
          aria-label="Next story"
          className="absolute right-0 top-0 bottom-0 w-1/3 z-[5] flex items-center justify-end pr-2"
        >
          <ChevronRight size={22} className="text-white/0" />
        </button>
      </div>
    </div>,
    document.body
  );
}
