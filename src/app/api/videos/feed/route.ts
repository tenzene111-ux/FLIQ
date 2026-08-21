import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { videoInclude, serializeVideo } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";

const PAGE_SIZE = 6;

export const GET = withErrorHandling(async (req: NextRequest) => {
  const tab = req.nextUrl.searchParams.get("tab") === "following" ? "following" : "foryou";
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0);

  const viewer = await getCurrentUser();
  const followingIds = await getFollowingIdSet(viewer?.id);
  const blockedIds = viewer
    ? (await prisma.blockedUser.findMany({ where: { blockerId: viewer.id }, select: { blockedId: true } })).map((b) => b.blockedId)
    : [];

  if (tab === "following") {
    if (!viewer || followingIds.size === 0) {
      return jsonOk({ videos: [], nextOffset: null, empty: true });
    }
    const authorIds = [...followingIds].filter((id) => !blockedIds.includes(id));
    const videos = await prisma.video.findMany({
      where: { userId: { in: authorIds }, status: "published" },
      include: videoInclude(viewer?.id),
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: PAGE_SIZE,
    });
    const serialized = videos.map((v) => serializeVideo(v, followingIds));
    return jsonOk({ videos: serialized, nextOffset: videos.length === PAGE_SIZE ? offset + PAGE_SIZE : null });
  }

  // For You: score-based ranking over the full published catalog.
  const all = await prisma.video.findMany({
    where: { status: "published", ...(blockedIds.length ? { userId: { notIn: blockedIds } } : {}) },
    include: videoInclude(viewer?.id),
  });

  if (all.length === 0) return jsonOk({ videos: [], nextOffset: null, empty: true });

  let interests: string[] = [];
  try {
    interests = viewer ? JSON.parse(viewer.interests || "[]") : [];
  } catch {
    interests = [];
  }

  const daySeed = new Date().toISOString().slice(0, 10);
  const jitterSeed = `${viewer?.id ?? "anon"}-${daySeed}`;

  function hashJitter(id: string) {
    let h = 0;
    const s = jitterSeed + id;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
    return (Math.abs(h) % 1000) / 1000; // 0..1
  }

  const scored = all.map((v) => {
    const dto = serializeVideo(v, followingIds);
    const ageHours = (Date.now() - v.createdAt.getTime()) / 3600000;
    const freshness = Math.max(0, 72 - ageHours) * 40; // newer videos ranked higher, decays over 3 days
    const engagement =
      dto.counts.views * 0.002 +
      dto.counts.likes * 0.6 +
      dto.counts.comments * 1.2 +
      dto.counts.shares * 1.5 +
      dto.counts.saves * 1.0;
    const completionBonus = (v.analytics?.completionRate ?? 0.4) * 3000;
    const interestBonus = dto.hashtags.some((h) => interests.includes(h)) ? 4000 : 0;
    const followBonus = dto.viewer.isFollowingAuthor ? 2500 : 0;
    const jitter = hashJitter(v.id) * 1500;
    const score = freshness + engagement + completionBonus + interestBonus + followBonus + jitter;
    return { dto, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const page = scored.slice(offset, offset + PAGE_SIZE).map((s) => s.dto);
  const nextOffset = offset + PAGE_SIZE < scored.length ? offset + PAGE_SIZE : offset % scored.length; // loop with fresh jitter next round

  return jsonOk({ videos: page, nextOffset: page.length ? nextOffset : null });
});
