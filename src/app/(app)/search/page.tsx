"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, X, Clock, TrendingUp, ArrowLeft, Play, Music2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { UserRow, type UserRowData } from "@/components/creator/UserRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getRecentSearches, addRecentSearch, clearRecentSearches } from "@/lib/recent-searches";
import { formatCount, cn } from "@/lib/utils";
import type { VideoDTO } from "@/types/models";

type Tab = "top" | "users" | "videos" | "sounds" | "hashtags";
const TABS: Tab[] = ["top", "users", "videos", "sounds", "hashtags"];

interface SearchResults {
  users: (UserRowData & { followerCount: number; isFollowing: boolean })[];
  videos: VideoDTO[];
  hashtags: { tag: string; viewCount: number; videoCount: number }[];
  sounds: { id: string; title: string; artist: string; coverUrl: string; videoCount: number }[];
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("top");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const debounced = useDebouncedValue(query, 300);

  useEffect(() => {
    setRecent(getRecentSearches());
    fetch("/api/search/trending")
      .then((r) => r.json())
      .then((d) => setTrending(d.trending || []))
      .catch(() => setTrending([]));
  }, []);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debounced)}&type=${tab}`)
      .then((r) => r.json())
      .then((d) => {
        setResults(d);
        setFollowing(new Set(d.users?.filter((u: { isFollowing: boolean }) => u.isFollowing).map((u: { id: string }) => u.id)));
      })
      .finally(() => setLoading(false));
  }, [debounced, tab]);

  function commitSearch(term: string) {
    setQuery(term);
    addRecentSearch(term);
    setRecent(getRecentSearches());
  }

  async function toggleFollow(u: UserRowData) {
    const isF = following.has(u.id);
    setFollowing((prev) => {
      const next = new Set(prev);
      isF ? next.delete(u.id) : next.add(u.id);
      return next;
    });
    await fetch(`/api/users/${u.username}/follow`, { method: isF ? "DELETE" : "POST" }).catch(() => {});
  }

  const showSuggestions = !query.trim();

  const activeResultsCount = useMemo(() => {
    if (!results) return 0;
    return results.users.length + results.videos.length + results.hashtags.length + results.sounds.length;
  }, [results]);

  return (
    <PageContainer className="max-w-2xl mx-auto w-full safe-top">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pt-4 pb-2 px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white shrink-0 md:hidden" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-surface-2 border border-border rounded-full px-4 py-2.5">
            <SearchIcon size={17} className="text-muted-2 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitSearch(query)}
              placeholder="Search Fliq"
              aria-label="Search Fliq"
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-muted-2 min-w-0"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="text-muted-2 hover:text-white shrink-0">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {!showSuggestions && (
          <div className="flex items-center gap-5 mt-3 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "pb-2 text-sm font-semibold capitalize border-b-2 -mb-px shrink-0 transition-colors",
                  tab === t ? "text-white border-white" : "text-muted-2 border-transparent"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4">
        {showSuggestions ? (
          <div className="pt-2 flex flex-col gap-6">
            {recent.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-white text-sm font-semibold">Recent</h2>
                  <button
                    onClick={() => {
                      clearRecentSearches();
                      setRecent([]);
                    }}
                    className="text-xs text-muted-2 hover:text-white"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-col">
                  {recent.map((r) => (
                    <button key={r} onClick={() => commitSearch(r)} className="flex items-center gap-3 py-2 text-left">
                      <Clock size={15} className="text-muted-2 shrink-0" />
                      <span className="text-sm text-white/90">{r}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h2 className="text-white text-sm font-semibold mb-2">Trending Searches</h2>
              <div className="flex flex-col">
                {trending.map((t) => (
                  <button key={t} onClick={() => commitSearch(`#${t}`)} className="flex items-center gap-3 py-2 text-left">
                    <TrendingUp size={15} className="text-fliq-cyan shrink-0" />
                    <span className="text-sm text-white/90">#{t}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="pt-8 text-center text-muted text-sm">Searching...</div>
        ) : !results || activeResultsCount === 0 ? (
          <EmptyState icon={SearchIcon} title="We couldn't find anything matching your search." description="Try a different keyword or check your spelling." />
        ) : (
          <div className="pt-2 pb-8 flex flex-col gap-6">
            {(tab === "top" || tab === "users") && results.users.length > 0 && (
              <SearchSection title="Users">
                <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
                  {results.users.map((u) => (
                    <UserRow key={u.id} user={u} following={following.has(u.id)} onToggleFollow={() => toggleFollow(u)} />
                  ))}
                </div>
              </SearchSection>
            )}
            {(tab === "top" || tab === "hashtags") && results.hashtags.length > 0 && (
              <SearchSection title="Hashtags">
                <div className="flex flex-col gap-1">
                  {results.hashtags.map((h) => (
                    <Link key={h.tag} href={`/discover/hashtag/${h.tag}`} className="flex items-center gap-3 py-2 hover:bg-white/5 rounded-lg px-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-brand-soft flex items-center justify-center text-fliq-cyan font-bold shrink-0">#</div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold">#{h.tag}</p>
                        <p className="text-muted-2 text-xs">{formatCount(h.viewCount)} views</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </SearchSection>
            )}
            {(tab === "top" || tab === "sounds") && results.sounds.length > 0 && (
              <SearchSection title="Sounds">
                <div className="flex flex-col gap-1">
                  {results.sounds.map((s) => (
                    <Link key={s.id} href={`/sounds/${s.id}`} className="flex items-center gap-3 py-2 hover:bg-white/5 rounded-lg px-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-semibold truncate">{s.title}</p>
                        <p className="text-muted-2 text-xs truncate">{s.artist} · {formatCount(s.videoCount)} videos</p>
                      </div>
                      <Music2 size={15} className="text-muted-2 shrink-0" />
                    </Link>
                  ))}
                </div>
              </SearchSection>
            )}
            {(tab === "top" || tab === "videos") && results.videos.length > 0 && (
              <SearchSection title="Videos">
                <div className="grid grid-cols-3 gap-0.5">
                  {results.videos.map((v) => (
                    <Link key={v.id} href={`/video/${v.id}`} className="relative aspect-[9/16] bg-surface-2 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.thumbnailUrl} alt={v.caption} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-1.5 left-1.5 text-white text-[11px] font-medium flex items-center gap-1">
                        <Play size={10} fill="white" /> {formatCount(v.counts.views)}
                      </div>
                      <p className="absolute bottom-1.5 right-1.5 text-white/80 text-[10px]">@{v.user.username}</p>
                    </Link>
                  ))}
                </div>
              </SearchSection>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function SearchSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-white text-sm font-semibold mb-2">{title}</h2>
      {children}
    </div>
  );
}
