import { prisma } from "@/lib/db";
import { isOnline } from "@/lib/presence";

export type ConversationGate = { ok: true; conversationId: string } | { ok: false; reason: string };

/** Respects the target's "Show activity status" privacy setting before exposing their online state to anyone else. */
export async function canShowOnlineStatus(targetUserId: string): Promise<boolean> {
  if (!isOnline(targetUserId)) return false;
  const settings = await prisma.userSettings.findUnique({ where: { userId: targetUserId } });
  return settings?.showActivityStatus ?? true;
}

/**
 * Read receipts are mutual, like most messaging apps: if either side has
 * turned them off, neither side sees "Seen" status for the other.
 */
export async function canShowReadReceipts(userIdA: string, userIdB: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: userIdA } }),
    prisma.userSettings.findUnique({ where: { userId: userIdB } }),
  ]);
  return (a?.readReceipts ?? true) && (b?.readReceipts ?? true);
}

/**
 * Finds or creates the 1:1 conversation between two users, applying the same
 * privacy rules everywhere a DM can originate from (composer, share sheet):
 * blocked users can't reach each other, and a recipient who only accepts
 * messages from followers gets a request instead of an active conversation.
 */
export async function getOrCreateDirectConversation(userId: string, otherUsername: string): Promise<ConversationGate> {
  const other = await prisma.user.findUnique({ where: { username: otherUsername.toLowerCase() } });
  if (!other) return { ok: false, reason: "User not found" };
  if (other.id === userId) return { ok: false, reason: "You can't message yourself" };

  const blocked = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: other.id },
        { blockerId: other.id, blockedId: userId },
      ],
    },
  });
  if (blocked) return { ok: false, reason: "You can't message this user" };

  let convo = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      participants: { some: { userId } },
      AND: { participants: { some: { userId: other.id } } },
    },
  });

  if (!convo) {
    const otherSettings = await prisma.userSettings.findUnique({ where: { userId: other.id } });
    if (otherSettings?.allowMessagesFrom === "none") {
      return { ok: false, reason: "This user isn't accepting messages right now" };
    }
    const isRequest =
      otherSettings?.allowMessagesFrom === "followers"
        ? !(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: other.id, followingId: userId } } }))
        : false;

    convo = await prisma.conversation.create({
      data: { participants: { create: [{ userId }, { userId: other.id, isRequest }] } },
    });
  }

  return { ok: true, conversationId: convo.id };
}
