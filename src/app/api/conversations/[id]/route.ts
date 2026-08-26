import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";
import { canShowOnlineStatus, canShowReadReceipts } from "@/lib/messaging";

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

  if (conversation.isGroup) {
    return jsonOk({
      conversation: {
        id: conversation.id,
        isGroup: true,
        name: conversation.name,
        avatarUrl: conversation.avatarUrl,
        isRequest: false,
        myRole: participant.role,
        myMuted: participant.muted,
        members: conversation.participants.map((p) => ({ ...p.user, role: p.role, isMe: p.userId === user.id })),
      },
    });
  }

  const otherParticipant = conversation.participants.find((p) => p.userId !== user.id);
  const other = otherParticipant?.user;

  const [online, readReceiptsOn] = other
    ? await Promise.all([canShowOnlineStatus(other.id, user.id), canShowReadReceipts(user.id, other.id)])
    : [false, false];

  return jsonOk({
    conversation: {
      id: conversation.id,
      isGroup: false,
      user: other,
      online,
      isRequest: participant.isRequest,
      otherLastReadAt: readReceiptsOn ? otherParticipant?.lastReadAt.toISOString() : null,
    },
  });
});

const patchSchema = z.object({ name: z.string().min(1).max(60).optional(), avatarUrl: z.string().optional() });

export const PATCH = withAuth<{ id: string }>(async (req, { user, params }) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: user.id } },
  });
  if (!participant) return jsonError("Conversation not found", 404);
  if (participant.role === "member") return jsonError("Only the group's owner or admins can do that", 403);

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conversation?.isGroup) return jsonError("Not a group conversation", 400);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid update", 422);

  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: { name: parsed.data.name, avatarUrl: parsed.data.avatarUrl },
  });

  return jsonOk({ conversation: { id: updated.id, name: updated.name, avatarUrl: updated.avatarUrl } });
});
