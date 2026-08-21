import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { videoInclude, serializeVideo } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";

export const GET = withErrorHandling<{ tag: string }>(async (req, { params }) => {
  const tag = params.tag.toLowerCase();
  const sort = req.nextUrl.searchParams.get("sort") === "recent" ? "recent" : "top";

  const hashtag = await prisma.hashtag.findUnique({ where: { tag } });
  if (!hashtag) return jsonError("Hashtag not found", 404);

  const viewer = await getCurrentUser();
  const followingIds = await getFollowingIdSet(viewer?.id);

  const videos = await prisma.video.findMany({
    where: { status: "published", hashtags: { some: { hashtagId: hashtag.id } } },
    include: videoInclude(viewer?.id),
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const dtos = videos.map((v) => serializeVideo(v, followingIds));
  if (sort === "top") dtos.sort((a, b) => b.counts.likes + b.counts.views * 0.01 - (a.counts.likes + a.counts.views * 0.01));

  return jsonOk({
    hashtag: { tag: hashtag.tag, viewCount: hashtag.viewCount, videoCount: videos.length },
    videos: dtos,
  });
});
