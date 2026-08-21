import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";
import { isOnline } from "@/lib/presence";

export const GET = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: user.id } },
  });
  if (!participant) return jsonError("Conversation not found", 404);

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { participants: { include: { user: { select: PUBLIC_USER_SELECT } } } },
  });
  if (!conversation) return jsonError("Conversation not found", 404);

  const other = conversation.participants.find((p) => p.userId !== user.id)?.user;

  return jsonOk({
    conversation: {
      id: conversation.id,
      user: other,
      online: other ? isOnline(other.id) : false,
      isRequest: participant.isRequest,
    },
  });
});
