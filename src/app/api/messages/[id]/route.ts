import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const message = await prisma.message.findUnique({ where: { id: params.id } });
  if (!message) return jsonError("Message not found", 404);
  if (message.senderId !== user.id) return jsonError("You can only delete your own messages", 403);

  await prisma.message.update({ where: { id: message.id }, data: { isDeleted: true, text: null, mediaUrl: null } });
  return jsonOk({ ok: true });
});
