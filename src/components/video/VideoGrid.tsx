"use client";

import Link from "next/link";
import { Play, Lock } from "lucide-react";
import { formatCount } from "@/lib/utils";
import type { VideoDTO } from "@/types/models";

export function VideoGrid({
  videos,
  linkBuilder,
}: {
  videos: (VideoDTO & { views?: number })[];
  linkBuilder?: (v: VideoDTO) => string;
}) {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {videos.map((v) => (
        <Link key={v.id} href={linkBuilder ? linkBuilder(v) : `/video/${v.id}`} className="relative aspect-[9/16] bg-surface-2 group overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.thumbnailUrl} alt={v.caption} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {v.privacy === "onlyMe" && (
            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
              <Lock size={10} className="text-white" />
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-[11px] font-medium drop-shadow">
            <Play size={11} fill="white" />
            {formatCount(v.counts.views)}
          </div>
        </Link>
      ))}
    </div>
  );
}
