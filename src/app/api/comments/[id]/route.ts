import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const comment = await prisma.comment.findUnique({ where: { id: params.id }, include: { video: true } });
  if (!comment) return jsonError("Comment not found", 404);
  if (comment.userId !== user.id && comment.video.userId !== user.id) {
    return jsonError("You can only delete your own comments", 403);
  }

  await prisma.comment.update({ where: { id: comment.id }, data: { isDeleted: true, text: "" } });
  return jsonOk({ ok: true });
});
