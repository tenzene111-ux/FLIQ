"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { UserRow, type UserRowData } from "@/components/creator/UserRow";
import { formatCount } from "@/lib/utils";

interface DiscoverPreview {
  hashtags: { tag: string; viewCount: number }[];
  creators: (UserRowData & { followerCount: number })[];
}

export function RightRail() {
  const [data, setData] = useState<DiscoverPreview | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/discover")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  async function toggleFollow(username: string) {
    const isF = following.has(username);
    setFollowing((prev) => {
      const next = new Set(prev);
      isF ? next.delete(username) : next.add(username);
      return next;
    });
    await fetch(`/api/users/${username}/follow`, { method: isF ? "DELETE" : "POST" }).catch(() => {});
  }

  if (!data) return <aside className="hidden xl:block w-[300px] shrink-0" />;

  return (
    <aside className="hidden xl:flex flex-col w-[300px] shrink-0 py-6 pl-6 gap-6 sticky top-0 h-screen overflow-y-auto no-scrollbar">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-white text-sm font-semibold">Suggested for you</p>
        </div>
        <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {data.creators.slice(0, 5).map((c) => (
            <UserRow key={c.id} user={c} following={following.has(c.username)} onToggleFollow={() => toggleFollow(c.username)} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={15} className="text-fliq-cyan" />
          <p className="text-white text-sm font-semibold">Trending hashtags</p>
        </div>
        <div className="flex flex-col gap-0.5">
          {data.hashtags.slice(0, 6).map((h) => (
            <Link key={h.tag} href={`/discover/hashtag/${h.tag}`} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5">
              <span className="text-white text-sm">#{h.tag}</span>
              <span className="text-muted-2 text-xs">{formatCount(h.viewCount)}</span>
            </Link>
          ))}
        </div>
      </div>

      <p className="text-muted-2 text-xs px-1">© {new Date().getFullYear()} Fliq · Watch. Create. Share.</p>
    </aside>
  );
}
