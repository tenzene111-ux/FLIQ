import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

const MAX_PINNED = 3;

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return jsonError("Video not found", 404);
  if (video.userId !== user.id) return jsonError("You can only pin your own posts", 403);
  if (video.status !== "published") return jsonError("Only published posts can be featured", 422);

  if (!video.isPinned) {
    const pinnedCount = await prisma.video.count({ where: { userId: user.id, isPinned: true } });
    if (pinnedCount >= MAX_PINNED) return jsonError(`You can only feature up to ${MAX_PINNED} posts`, 422);
  }

  const updated = await prisma.video.update({
    where: { id: video.id },
    data: { isPinned: !video.isPinned, pinnedAt: !video.isPinned ? new Date() : null },
  });

  return jsonOk({ isPinned: updated.isPinned });
});
