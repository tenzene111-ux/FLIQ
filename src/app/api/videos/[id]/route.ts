import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling, withAuth } from "@/lib/api";
import { videoInclude, serializeVideo } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";

export const GET = withErrorHandling<{ id: string }>(async (_req, { params }) => {
  const viewer = await getCurrentUser();
  const video = await prisma.video.findUnique({ where: { id: params.id }, include: videoInclude(viewer?.id) });
  if (!video || video.status === "removed") return jsonError("This video isn't available", 404);
  if (video.privacy === "onlyMe" && video.userId !== viewer?.id) return jsonError("This video isn't available", 404);

  const followingIds = await getFollowingIdSet(viewer?.id);
  if (video.privacy === "followers" && video.userId !== viewer?.id && !followingIds.has(video.userId)) {
    return jsonError("This video is only visible to followers", 403);
  }

  return jsonOk({ video: serializeVideo(video, followingIds) });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return jsonError("Video not found", 404);
  if (video.userId !== user.id) return jsonError("You can only delete your own videos", 403);

  await prisma.video.delete({ where: { id: video.id } });
  return jsonOk({ ok: true });
});
