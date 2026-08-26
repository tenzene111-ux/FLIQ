import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";
import { canShowOnlineStatus } from "@/lib/messaging";

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const tab = req.nextUrl.searchParams.get("tab") === "requests" ? "requests" : "messages";

  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: user.id, isRequest: tab === "requests" },
    include: {
      conversation: {
        include: {
          participants: { include: { user: { select: PUBLIC_USER_SELECT } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { username: true } } } },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const conversations = await Promise.all(
    participations.map(async (p) => {
      const other = !p.conversation.isGroup ? p.conversation.participants.find((x) => x.userId !== user.id)?.user : undefined;
      const lastMessage = p.conversation.messages[0];
      const unreadCount = await prisma.message.count({
        where: { conversationId: p.conversationId, senderId: { not: user.id }, createdAt: { gt: p.lastReadAt }, isDeleted: false },
      });
      return {
        id: p.conversationId,
        isGroup: p.conversation.isGroup,
        name: p.conversation.isGroup ? p.conversation.name : null,
        avatarUrl: p.conversation.isGroup ? p.conversation.avatarUrl : null,
        memberCount: p.conversation.isGroup ? p.conversation.participants.length : null,
        user: other ?? null,
        online: other ? await canShowOnlineStatus(other.id) : false,
        lastMessage: lastMessage
          ? {
              text: lastMessage.isDeleted ? "Message deleted" : lastMessage.text,
              type: lastMessage.type,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
              senderUsername: lastMessage.sender.username,
            }
          : null,
        unreadCount,
        updatedAt: p.conversation.updatedAt,
      };
    })
  );

  return jsonOk({ conversations });
});
