"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Clock, Users, Heart, MessageCircle, Share2, Bookmark, Play } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatTile } from "@/components/analytics/StatTile";
import { TrendAreaChart, TrendLineChart, RetentionChart } from "@/components/analytics/TrendChart";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCount, formatDuration, cn } from "@/lib/utils";

type Range = "7" | "28" | "90" | "custom";

interface Overview {
  totals: { views: number; watchTime: number; followers: number; likes: number; comments: number; shares: number; saves: number };
  series: {
    views: { date: string; value: number }[];
    followers: { date: string; value: number }[];
    engagement: { date: string; value: number }[];
    retention: { point: string; pct: number }[];
  };
  videos: {
    id: string;
    caption: string;
    thumbnailUrl: string;
    views: number;
    avgWatchSeconds: number;
    completionRate: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [range, setRange] = useState<Range>("7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState(false);

  function load() {
    if (range === "custom" && (!customFrom || !customTo)) return;
    setError(false);
    const qs = range === "custom" ? `range=custom&from=${customFrom}&to=${customTo}` : `range=${range}`;
    fetch(`/api/analytics/overview?${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }

  useEffect(load, [range, customFrom, customTo]);

  return (
    <PageContainer className="max-w-3xl mx-auto w-full safe-top">
      <div className="flex items-center gap-3 px-4 pt-5 pb-2">
        <button onClick={() => router.back()} className="text-white md:hidden" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-xl font-bold">Analytics</h1>
      </div>

      <div className="flex items-center gap-2 px-4 pb-2 flex-wrap">
        {(["7", "28", "90"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn("px-3.5 py-1.5 rounded-full text-xs font-semibold border", range === r ? "bg-white text-black border-white" : "border-border text-white")}
          >
            {r} days
          </button>
        ))}
        <button
          onClick={() => setRange("custom")}
          className={cn("px-3.5 py-1.5 rounded-full text-xs font-semibold border", range === "custom" ? "bg-white text-black border-white" : "border-border text-white")}
        >
          Custom
        </button>
      </div>

      {range === "custom" && (
        <div className="flex items-center gap-2 px-4 pb-4">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
            aria-label="From date"
          />
          <span className="text-muted-2 text-xs">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
            aria-label="To date"
          />
        </div>
      )}

      {range === "custom" && (!customFrom || !customTo) ? (
        <p className="text-muted text-sm text-center py-10">Choose a start and end date to view analytics.</p>
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : !data ? (
        <div className="px-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-5 pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile icon={Eye} label="Total Views" value={data.totals.views} accent="#22d3ee" />
            <StatTile icon={Clock} label="Watch Time (s)" value={data.totals.watchTime} accent="#3b82f6" />
            <StatTile icon={Users} label="Followers" value={data.totals.followers} accent="#8b5cf6" />
            <StatTile icon={Heart} label="Likes" value={data.totals.likes} accent="#ec4899" />
            <StatTile icon={MessageCircle} label="Comments" value={data.totals.comments} accent="#d946ef" />
            <StatTile icon={Share2} label="Shares" value={data.totals.shares} accent="#22d3ee" />
            <StatTile icon={Bookmark} label="Saves" value={data.totals.saves} accent="#f59e0b" />
          </div>

          <TrendAreaChart data={data.series.views} color="#22d3ee" title="Views over time" />
          <TrendLineChart data={data.series.followers} color="#8b5cf6" title="Followers over time" />
          <TrendAreaChart data={data.series.engagement} color="#ec4899" title="Engagement (likes + comments + shares)" />
          <RetentionChart data={data.series.retention} color="#3b82f6" />

          <div>
            <p className="text-white text-sm font-semibold mb-3">Video performance</p>
            <div className="flex flex-col divide-y divide-border rounded-2xl border border-border overflow-hidden">
              {data.videos.length === 0 && <p className="text-muted text-sm text-center py-6">Post a video to see performance data.</p>}
              {data.videos.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-3.5 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnailUrl} alt="" className="w-10 h-12 rounded-md object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate max-w-[160px]">{v.caption || "Untitled"}</p>
                    <p className="text-muted-2 text-[11px] flex items-center gap-1 mt-0.5">
                      <Play size={10} fill="currentColor" /> {formatCount(v.views)} · {formatDuration(v.avgWatchSeconds)} avg · {Math.round(v.completionRate * 100)}%
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-2 shrink-0">
                    <span className="flex items-center gap-1">
                      <Heart size={11} /> {formatCount(v.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={11} /> {formatCount(v.comments)}
                    </span>
                    <span className="hidden sm:flex items-center gap-1">
                      <Share2 size={11} /> {formatCount(v.shares)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
