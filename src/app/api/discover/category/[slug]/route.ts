import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { videoInclude, serializeVideo } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";
import { CATEGORIES, CATEGORY_HASHTAGS, type CategorySlug } from "@/lib/constants";

export const GET = withErrorHandling<{ slug: string }>(async (_req, { params }) => {
  const slug = params.slug as CategorySlug;
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) return jsonError("Category not found", 404);

  const tags = CATEGORY_HASHTAGS[slug] ?? [];
  const viewer = await getCurrentUser();
  const followingIds = await getFollowingIdSet(viewer?.id);

  const videos = await prisma.video.findMany({
    where: { status: "published", hashtags: { some: { hashtag: { tag: { in: tags } } } } },
    include: videoInclude(viewer?.id),
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return jsonOk({ category, videos: videos.map((v) => serializeVideo(v, followingIds)) });
});
