import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { videoInclude, serializeVideo, serializeSound } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";

export const GET = withErrorHandling<{ id: string }>(async (_req, { params }) => {
  const sound = await prisma.sound.findUnique({
    where: { id: params.id },
    include: { owner: { select: { username: true, displayName: true } }, _count: { select: { videos: true } } },
  });
  if (!sound) return jsonError("Sound not found", 404);

  const viewer = await getCurrentUser();
  const followingIds = await getFollowingIdSet(viewer?.id);

  const videos = await prisma.video.findMany({
    where: { soundId: sound.id, status: "published" },
    include: videoInclude(viewer?.id),
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return jsonOk({
    sound: { ...serializeSound(sound), videoCount: sound._count.videos, owner: sound.owner },
    videos: videos.map((v) => serializeVideo(v, followingIds)),
  });
});
