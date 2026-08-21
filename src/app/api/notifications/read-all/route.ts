import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";

export const POST = withAuth(async (_req, { user }) => {
  await prisma.notification.updateMany({ where: { recipientId: user.id, isRead: false }, data: { isRead: true } });
  return jsonOk({ ok: true });
});
