import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const DELETE = withAuth<{ id: string; userId: string }>(async (_req, { user, params }) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: user.id } },
  });
  if (!participant) return jsonError("Conversation not found", 404);
  if (participant.role === "member") return jsonError("Only the group's owner or admins can remove members", 403);

  const target = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: params.userId } },
  });
  if (!target) return jsonError("That person isn't in this group", 404);
  if (target.role === "owner") return jsonError("The group owner can't be removed", 403);

  await prisma.conversationParticipant.delete({ where: { id: target.id } });
  return jsonOk({ ok: true });
});
