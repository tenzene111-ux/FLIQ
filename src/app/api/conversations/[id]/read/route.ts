import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const updated = await prisma.conversationParticipant
    .update({
      where: { conversationId_userId: { conversationId: params.id, userId: user.id } },
      data: { lastReadAt: new Date() },
    })
    .catch(() => null);
  if (!updated) return jsonError("Conversation not found", 404);
  return jsonOk({ ok: true });
});
