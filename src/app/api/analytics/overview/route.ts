import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { mulberry32, seedFromString } from "@/lib/rng";
import { getProfileStats } from "@/lib/social";

function daysForRange(range: string, from?: string | null, to?: string | null): number {
  if (range === "custom" && from && to) {
    const d = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
    return Math.max(1, Math.min(365, d));
  }
  return range === "90" ? 90 : range === "28" ? 28 : 7;
}

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const range = req.nextUrl.searchParams.get("range") || "7";
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const days = daysForRange(range, from, to);

  const [analytics, stats, videos] = await Promise.all([
    prisma.creatorAnalytics.findUnique({ where: { userId: user.id } }),
    getProfileStats(user.id),
    prisma.video.findMany({
      where: { userId: user.id, status: "published" },
      include: { analytics: true, _count: { select: { likes: true, comments: true, shares: true, saves: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totals = {
    views: (analytics?.totalViews ?? 0) + videos.reduce((s, v) => s + (v.analytics?.views ?? 0), 0),
    watchTime: analytics?.totalWatchTime ?? 0,
    followers: stats.followers,
    likes: stats.likes,
    comments: (analytics?.totalComments ?? 0) + videos.reduce((s, v) => s + v._count.comments, 0),
    shares: (analytics?.totalShares ?? 0) + videos.reduce((s, v) => s + v._count.shares, 0),
    saves: (analytics?.totalSaves ?? 0) + videos.reduce((s, v) => s + v._count.saves, 0),
  };

  const rng = mulberry32(seedFromString(`${user.id}-${range}-${from ?? ""}-${to ?? ""}`));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function buildSeries(total: number, growth: boolean) {
    const weights = Array.from({ length: days }, (_, i) => {
      const base = growth ? 0.6 + (i / days) * 0.8 : 1;
      return base * (0.5 + rng());
    });
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
    return weights.map((w, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (days - 1 - i));
      return { date: date.toISOString().slice(0, 10), value: Math.round((w / weightSum) * total) };
    });
  }

  function buildFollowersSeries(finalTotal: number) {
    const startTotal = Math.round(finalTotal * 0.94);
    const gained = Math.max(finalTotal - startTotal, days);
    const dailyGains = buildSeries(gained, true);
    let running = startTotal;
    return dailyGains.map((p) => {
      running += p.value;
      return { date: p.date, value: running };
    });
  }

  const viewsSeries = buildSeries(Math.max(totals.views, days * 50), true);
  const followersSeries = buildFollowersSeries(Math.max(totals.followers, days));
  const engagementSeries = buildSeries(Math.max(totals.likes + totals.comments + totals.shares, days * 10), false);
  const retention = Array.from({ length: 10 }, (_, i) => ({
    point: `${i * 10}%`,
    pct: Math.max(8, Math.round(100 - i * (7 + rng() * 5))),
  }));

  const videoRows = videos.slice(0, 20).map((v) => {
    const views = v.analytics?.views ?? 0;
    return {
      id: v.id,
      caption: v.caption,
      thumbnailUrl: v.thumbnailUrl,
      createdAt: v.createdAt.toISOString(),
      views,
      avgWatchSeconds: v.analytics?.avgWatchSeconds ?? 0,
      completionRate: v.analytics?.completionRate ?? 0,
      likes: (v.analytics?.likes ?? 0) + v._count.likes,
      comments: (v.analytics?.comments ?? 0) + v._count.comments,
      shares: (v.analytics?.shares ?? 0) + v._count.shares,
      saves: (v.analytics?.saves ?? 0) + v._count.saves,
    };
  });

  return jsonOk({
    totals,
    series: { views: viewsSeries, followers: followersSeries, engagement: engagementSeries, retention },
    videos: videoRows,
  });
});
