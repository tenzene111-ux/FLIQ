import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const notification = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!notification || notification.recipientId !== user.id) return jsonError("Not found", 404);
  await prisma.notification.update({ where: { id: params.id }, data: { isRead: true } });
  return jsonOk({ ok: true });
});
