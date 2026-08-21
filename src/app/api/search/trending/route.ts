import { prisma } from "@/lib/db";
import { jsonOk, withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(async () => {
  const hashtags = await prisma.hashtag.findMany({ orderBy: { viewCount: "desc" }, take: 6, select: { tag: true } });
  return jsonOk({ trending: hashtags.map((h) => h.tag) });
});
