import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";

export const GET = withAuth(async (_req, { user }) => {
  const notifications = await prisma.notification.count({ where: { recipientId: user.id, isRead: false } });

  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: user.id, isRequest: false },
    select: { conversationId: true, lastReadAt: true },
  });

  let messages = 0;
  for (const p of participations) {
    const unread = await prisma.message.count({
      where: { conversationId: p.conversationId, senderId: { not: user.id }, createdAt: { gt: p.lastReadAt }, isDeleted: false },
    });
    if (unread > 0) messages += 1; // unread conversation count, not raw message count
  }

  return jsonOk({ notifications, messages });
});
