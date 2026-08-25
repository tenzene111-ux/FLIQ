"use client";

import Link from "next/link";
import { Radio, Eye } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatCount } from "@/lib/utils";

export interface LiveFeedItem {
  id: string;
  title: string;
  category: string;
  viewerCount: number;
  user: { username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
}

/**
 * A recommendation card for an active live stream, shown inline in the For
 * You feed. Unlike a video/photo post this never autoplays — it's a static
 * preview the viewer taps into deliberately, so LIVE never interrupts the
 * normal scroll.
 */
export function LiveFeedCard({ stream }: { stream: LiveFeedItem }) {
  return (
    <Link
      href={`/live/${stream.id}`}
      className="relative w-full h-full flex flex-col items-center justify-center bg-black snap-item overflow-hidden"
    >
      {stream.user.avatarUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-40"
          style={{ backgroundImage: `url(${stream.user.avatarUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />

      <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center">
        <span className="flex items-center gap-1.5 bg-danger text-white text-xs font-bold px-3 py-1 rounded-full">
          <Radio size={12} /> LIVE
        </span>
        <Avatar src={stream.user.avatarUrl} alt={stream.user.displayName} size="2xl" ring verified={stream.user.isVerified} />
        <div>
          <p className="text-white font-bold text-lg">@{stream.user.username}</p>
          <p className="text-white/90 text-sm mt-1 max-w-xs">{stream.title}</p>
        </div>
        <span className="flex items-center gap-1.5 text-white/80 text-sm">
          <Eye size={15} /> {formatCount(stream.viewerCount)} watching
        </span>
        <span className="mt-2 bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-full">Tap to join</span>
      </div>
    </Link>
  );
}
