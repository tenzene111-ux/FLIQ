import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { messageInclude, serializeMessage } from "@/lib/serialize";

async function requireParticipant(conversationId: string, userId: string) {
  return prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
}

export const GET = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const participant = await requireParticipant(params.id, user.id);
  if (!participant) return jsonError("Conversation not found", 404);

  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    include: messageInclude(),
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return jsonOk({ messages: messages.map(serializeMessage) });
});

const schema = z.object({
  type: z.enum(["text", "image", "video", "audio", "gif"]).default("text"),
  text: z.string().max(2000).optional(),
  mediaUrl: z.string().optional(),
  replyToId: z.string().optional().nullable(),
});

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const participant = await requireParticipant(params.id, user.id);
  if (!participant) return jsonError("Conversation not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid message", 422);
  if (!parsed.data.text?.trim() && !parsed.data.mediaUrl) return jsonError("Message can't be empty", 422);

  // Sending a reply un-marks a pending request for the sender's side.
  if (participant.isRequest) {
    await prisma.conversationParticipant.update({ where: { id: participant.id }, data: { isRequest: false } });
  }
  const message = await prisma.message.create({
    data: {
      conversationId: params.id,
      senderId: user.id,
      type: parsed.data.type,
      text: parsed.data.text,
      mediaUrl: parsed.data.mediaUrl,
      replyToId: parsed.data.replyToId || null,
    },
    include: messageInclude(),
  });

  await prisma.conversation.update({ where: { id: params.id }, data: { updatedAt: new Date() } });
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: params.id, userId: user.id } },
    data: { lastReadAt: new Date() },
  });

  return jsonOk({ message: serializeMessage(message) }, 201);
});
