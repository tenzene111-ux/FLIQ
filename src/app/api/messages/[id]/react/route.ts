import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { messageInclude, serializeMessage } from "@/lib/serialize";

const schema = z.object({ emoji: z.string().min(1).max(8) });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const message = await prisma.message.findUnique({ where: { id: params.id } });
  if (!message) return jsonError("Message not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid reaction", 422);

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId: message.id, userId: user.id, emoji: parsed.data.emoji } },
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.messageReaction.create({ data: { messageId: message.id, userId: user.id, emoji: parsed.data.emoji } });
  }

  const updated = await prisma.message.findUniqueOrThrow({ where: { id: message.id }, include: messageInclude() });
  return jsonOk({ message: serializeMessage(updated) });
});
