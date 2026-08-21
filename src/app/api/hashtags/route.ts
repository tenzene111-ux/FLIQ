import { prisma } from "@/lib/db";
import { jsonOk, withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(async () => {
  const hashtags = await prisma.hashtag.findMany({
    orderBy: { viewCount: "desc" },
    include: { _count: { select: { videos: true } } },
    take: 100,
  });

  return jsonOk({
    hashtags: hashtags.map((h) => ({ tag: h.tag, viewCount: h.viewCount, videoCount: h._count.videos })),
  });
});
