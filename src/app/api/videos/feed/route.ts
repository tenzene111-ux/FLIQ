import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { videoInclude, serializeVideo } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";
import { getHashtagAffinity, getNegativeSignal, matchesKeywordFilter, diversifyByAuthor } from "@/lib/ranking";

const PAGE_SIZE = 6;
const CANDIDATE_POOL_SIZE = 300;

export const GET = withErrorHandling(async (req: NextRequest) => {
  const tab = req.nextUrl.searchParams.get("tab") === "following" ? "following" : "foryou";
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0);

  const viewer = await getCurrentUser();
  const followingIds = await getFollowingIdSet(viewer?.id);
  const [blockedRows, mutedRows] = viewer
    ? await Promise.all([
        prisma.blockedUser.findMany({ where: { blockerId: viewer.id }, select: { blockedId: true } }),
        prisma.mutedUser.findMany({ where: { userId: viewer.id }, select: { mutedId: true } }),
      ])
    : [[], []];
  const excludedAuthorIds = [...blockedRows.map((b) => b.blockedId), ...mutedRows.map((m) => m.mutedId)];

  if (tab === "following") {
    if (!viewer || followingIds.size === 0) {
      return jsonOk({ videos: [], nextOffset: null, empty: true });
    }
    const authorIds = [...followingIds].filter((id) => !excludedAuthorIds.includes(id));
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

  const negative = viewer
    ? await getNegativeSignal(viewer.id)
    : { videoIds: new Set<string>(), hashtagPenalty: new Map<string, number>(), creatorPenalty: new Map<string, number>() };

  // For You: score-based ranking over a bounded candidate pool — the most
  // recent CANDIDATE_POOL_SIZE published videos. Freshness already decays to
  // 0 past 72 hours, so this doesn't change what tends to rank highly; it
  // just stops every feed request from scanning the entire video catalog.
  const all = await prisma.video.findMany({
    where: {
      status: "published",
      ...(excludedAuthorIds.length ? { userId: { notIn: excludedAuthorIds } } : {}),
      ...(negative.videoIds.size ? { id: { notIn: [...negative.videoIds] } } : {}),
    },
    include: videoInclude(viewer?.id),
    orderBy: { createdAt: "desc" },
    take: CANDIDATE_POOL_SIZE,
  });

  if (all.length === 0) return jsonOk({ videos: [], nextOffset: null, empty: true });

  let interests: string[] = [];
  try {
    interests = viewer ? JSON.parse(viewer.interests || "[]") : [];
  } catch {
    interests = [];
  }
  const affinity = viewer ? await getHashtagAffinity(viewer.id) : new Map<string, number>();

  let keywordFilters: string[] = [];
  if (viewer) {
    const settings = await prisma.userSettings.findUnique({ where: { userId: viewer.id }, select: { keywordFilters: true } });
    try {
      keywordFilters = JSON.parse(settings?.keywordFilters || "[]");
    } catch {
      keywordFilters = [];
    }
  }

  const daySeed = new Date().toISOString().slice(0, 10);
  const jitterSeed = `${viewer?.id ?? "anon"}-${daySeed}`;

  function hashJitter(id: string) {
    let h = 0;
    const s = jitterSeed + id;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
    return (Math.abs(h) % 1000) / 1000; // 0..1
  }

  const scored = all
    .filter((v) => !matchesKeywordFilter(v.caption, v.hashtags.map((h) => h.hashtag.tag), keywordFilters))
    .map((v) => {
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
      // Static onboarding interests give a flat bonus; real behavior (likes,
      // completed watches) gives a scaled bonus once the viewer has any history,
      // so the feed adapts to what they actually engage with over time.
      const staticInterestBonus = dto.hashtags.some((h) => interests.includes(h)) ? 4000 : 0;
      const affinityBonus = dto.hashtags.reduce((sum, h) => sum + (affinity.get(h) ?? 0), 0) * 250;
      const followBonus = dto.viewer.isFollowingAuthor ? 2500 : 0;
      const jitter = hashJitter(v.id) * 1500;
      // "Not Interested" pushes down similar creators/hashtags rather than
      // just hiding the one video (which is already excluded from `all`).
      const negativePenalty =
        (negative.creatorPenalty.get(v.userId) ?? 0) * 3000 +
        dto.hashtags.reduce((sum, h) => sum + (negative.hashtagPenalty.get(h) ?? 0), 0) * 800;
      const score =
        freshness + engagement + completionBonus + staticInterestBonus + affinityBonus + followBonus + jitter - negativePenalty;
      return { dto, score };
    });

  if (scored.length === 0) return jsonOk({ videos: [], nextOffset: null, empty: true });

  scored.sort((a, b) => b.score - a.score);
  const pageSlice = scored.slice(offset, offset + PAGE_SIZE);
  const page = diversifyByAuthor(pageSlice).map((s) => s.dto);
  const nextOffset = offset + PAGE_SIZE < scored.length ? offset + PAGE_SIZE : offset % scored.length; // loop with fresh jitter next round

  return jsonOk({ videos: page, nextOffset: page.length ? nextOffset : null });
});
