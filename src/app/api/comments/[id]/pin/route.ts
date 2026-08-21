import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const comment = await prisma.comment.findUnique({ where: { id: params.id }, include: { video: true } });
  if (!comment) return jsonError("Comment not found", 404);
  if (comment.video.userId !== user.id) return jsonError("Only the creator can pin comments", 403);

  // Unpin any currently pinned comment on this video first (single pin slot).
  await prisma.comment.updateMany({ where: { videoId: comment.videoId, isPinned: true }, data: { isPinned: false } });
  const nextPinned = !comment.isPinned;
  await prisma.comment.update({ where: { id: comment.id }, data: { isPinned: nextPinned } });

  return jsonOk({ pinned: nextPinned });
});
