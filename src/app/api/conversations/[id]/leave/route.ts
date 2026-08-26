import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { participants: { orderBy: { id: "asc" } } },
  });
  if (!conversation?.isGroup) return jsonError("Not a group conversation", 400);

  const me = conversation.participants.find((p) => p.userId === user.id);
  if (!me) return jsonError("You're not in this group", 404);

  await prisma.conversationParticipant.delete({ where: { id: me.id } });

  // Hand ownership to the longest-standing remaining member so the group
  // never ends up without one.
  if (me.role === "owner") {
    const next = conversation.participants.find((p) => p.userId !== user.id);
    if (next) await prisma.conversationParticipant.update({ where: { id: next.id }, data: { role: "owner" } });
  }

  return jsonOk({ ok: true });
});
