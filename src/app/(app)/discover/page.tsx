"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, Sparkles, Radio } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RightRail } from "@/components/layout/RightRail";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCount } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";

interface DiscoverData {
  hashtags: { tag: string; viewCount: number; videoCount: number; thumbnails: string[] }[];
  creators: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean; bio: string; followerCount: number }[];
  categories: { slug: string; label: string; emoji: string; videoCount: number }[];
  sounds: { id: string; title: string; artist: string; coverUrl: string; isOriginal: boolean; videoCount: number }[];
}

interface LiveStreamPreview {
  id: string;
  title: string;
  category: string;
  viewerCount: number;
  user: { username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
}

export default function DiscoverPage() {
  const [data, setData] = useState<DiscoverData | null>(null);
  const [error, setError] = useState(false);
  const [liveStreams, setLiveStreams] = useState<LiveStreamPreview[]>([]);

  function load() {
    setError(false);
    setData(null);
    fetch("/api/discover")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true));
    fetch("/api/live")
      .then((r) => r.json())
      .then((d) => setLiveStreams(d.streams || []))
      .catch(() => {});
  }

  useEffect(load, []);

  return (
    <div className="flex justify-center w-full">
    <PageContainer className="max-w-2xl w-full safe-top">
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-2xl font-bold text-white mb-4">Discover</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="flex-1 flex items-center gap-2.5 bg-surface-2 border border-border rounded-xl px-4 py-3 text-muted-2 hover:border-border-strong transition-colors"
          >
            <Search size={18} />
            <span className="text-sm">Search creators, hashtags or videos</span>
          </Link>
          <Link
            href="/live"
            aria-label="Watch Live"
            className="shrink-0 flex items-center gap-1.5 bg-danger/15 border border-danger/30 text-danger rounded-xl px-3.5 py-3 text-xs font-semibold"
          >
            <Radio size={15} /> Live
          </Link>
        </div>
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : !data ? (
        <DiscoverSkeleton />
      ) : (
        <div className="px-4 pb-8 flex flex-col gap-8">
          {/* Hero challenge card */}
          <Link
            href={`/discover/hashtag/${data.hashtags[0]?.tag ?? "fliqstar"}`}
            className="relative rounded-2xl overflow-hidden bg-gradient-brand-diag p-6 flex flex-col gap-3 min-h-[150px] justify-center"
          >
            <Sparkles className="absolute right-4 top-4 text-white/30" size={64} />
            <span className="text-white/80 text-xs font-semibold uppercase tracking-wide">#FliqStar</span>
            <h2 className="text-white text-2xl font-extrabold">Join the challenge</h2>
            <span className="inline-flex w-fit items-center gap-1 bg-white text-black text-sm font-semibold px-4 py-2 rounded-full mt-1">
              Join Now
            </span>
          </Link>

          {/* LIVE now */}
          {liveStreams.length > 0 && (
            <Section title="LIVE Now" href="/live">
              <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-1 px-1">
                {liveStreams.slice(0, 8).map((s) => (
                  <Link key={s.id} href={`/live/${s.id}`} className="flex flex-col items-center gap-2 shrink-0 w-20 text-center">
                    <div className="relative">
                      <Avatar src={s.user.avatarUrl} alt={s.user.displayName} size="xl" ring verified={s.user.isVerified} />
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-danger text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        <Radio size={8} /> LIVE
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate w-20">@{s.user.username}</p>
                      <p className="text-muted-2 text-[11px]">{formatCount(s.viewerCount)} watching</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Trending hashtags */}
          <Section title="Trending Hashtags" href="/discover/hashtags">
            <div className="flex flex-col divide-y divide-border rounded-2xl border border-border overflow-hidden">
              {data.hashtags.map((h) => (
                <Link key={h.tag} href={`/discover/hashtag/${h.tag}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-brand-soft flex items-center justify-center text-fliq-cyan font-bold shrink-0">
                    #
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">#{h.tag}</p>
                    <p className="text-muted-2 text-xs">{formatCount(h.viewCount)} views</p>
                  </div>
                  <div className="flex -space-x-2 shrink-0">
                    {h.thumbnails.slice(0, 3).map((t, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={t} alt="" className="w-8 h-10 rounded-md object-cover border-2 border-background" />
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </Section>

          {/* Trending sounds */}
          {data.sounds.length > 0 && (
            <Section title="Trending Sounds" href="/discover/sounds">
              <div className="flex flex-col divide-y divide-border rounded-2xl border border-border overflow-hidden">
                {data.sounds.slice(0, 5).map((s) => (
                  <Link key={s.id} href={`/sounds/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                    <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.coverUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {s.isOriginal ? `original sound · ${s.artist}` : s.title}
                      </p>
                      <p className="text-muted-2 text-xs">{formatCount(s.videoCount)} videos</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Top creators */}
          <Section title="Top Creators">
            <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-1 px-1">
              {data.creators.map((c) => (
                <Link key={c.id} href={`/profile/${c.username}`} className="flex flex-col items-center gap-2 shrink-0 w-20 text-center">
                  <Avatar src={c.avatarUrl} alt={c.displayName} size="xl" ring verified={c.isVerified} />
                  <div className="min-w-0">
                    <p className="text-white text-xs font-semibold truncate w-20">{c.displayName}</p>
                    <p className="text-muted-2 text-[11px]">{formatCount(c.followerCount)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>

          {/* Categories */}
          <Section title="Categories">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/discover/category/${c.slug}`}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-surface-2 hover:bg-surface-3 transition-colors"
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${c.color}22`, color: c.color }}
                  >
                    <c.icon size={17} />
                  </span>
                  <span className="text-white text-sm font-medium">{c.label}</span>
                </Link>
              ))}
            </div>
          </Section>

          {data.hashtags.length === 0 && data.creators.length === 0 && (
            <EmptyState icon={Sparkles} title="Nothing trending yet" description="Check back soon." />
          )}
        </div>
      )}
    </PageContainer>
    <RightRail />
    </div>
  );
}

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold text-base">{title}</h2>
        {href && (
          <Link href={href} className="text-xs text-muted flex items-center hover:text-white">
            View all <ChevronRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="px-4 flex flex-col gap-8">
      <Skeleton className="h-[150px] rounded-2xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
