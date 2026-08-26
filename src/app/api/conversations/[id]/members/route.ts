import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({ usernames: z.array(z.string()).min(1).max(20) });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: user.id } },
  });
  if (!participant) return jsonError("Conversation not found", 404);
  if (participant.role === "member") return jsonError("Only the group's owner or admins can add members", 403);

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id }, include: { participants: true } });
  if (!conversation?.isGroup) return jsonError("Not a group conversation", 400);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request", 422);

  const existingIds = new Set(conversation.participants.map((p) => p.userId));
  const users = await prisma.user.findMany({ where: { username: { in: parsed.data.usernames.map((u) => u.toLowerCase()) } } });
  const toAdd = users.filter((u) => !existingIds.has(u.id));
  if (toAdd.length === 0) return jsonError("Everyone you picked is already in this group", 422);

  await prisma.conversationParticipant.createMany({ data: toAdd.map((u) => ({ conversationId: params.id, userId: u.id, role: "member" })) });

  return jsonOk({ added: toAdd.length });
});
