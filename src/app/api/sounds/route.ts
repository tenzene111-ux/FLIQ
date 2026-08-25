import { prisma } from "@/lib/db";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { serializeSound } from "@/lib/serialize";

export const GET = withErrorHandling(async () => {
  const sounds = await prisma.sound.findMany({
    include: { _count: { select: { videos: true } } },
    orderBy: { videos: { _count: "desc" } },
    take: 100,
  });

  return jsonOk({
    sounds: sounds.map((s) => ({ ...serializeSound(s), videoCount: s._count.videos })),
  });
});
