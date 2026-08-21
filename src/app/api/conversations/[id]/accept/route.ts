import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const updated = await prisma.conversationParticipant
    .update({
      where: { conversationId_userId: { conversationId: params.id, userId: user.id } },
      data: { isRequest: false },
    })
    .catch(() => null);
  if (!updated) return jsonError("Conversation not found", 404);
  return jsonOk({ ok: true });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: user.id } },
  });
  if (!participant) return jsonError("Conversation not found", 404);
  await prisma.conversation.delete({ where: { id: params.id } }).catch(() => {});
  return jsonOk({ ok: true });
});
