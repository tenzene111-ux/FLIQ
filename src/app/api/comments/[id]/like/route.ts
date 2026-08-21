import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const comment = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!comment) return jsonError("Comment not found", 404);

  await prisma.commentLike.upsert({
    where: { userId_commentId: { userId: user.id, commentId: comment.id } },
    create: { userId: user.id, commentId: comment.id },
    update: {},
  });
  return jsonOk({ liked: true });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  await prisma.commentLike.delete({ where: { userId_commentId: { userId: user.id, commentId: params.id } } }).catch(() => {});
  return jsonOk({ liked: false });
});
