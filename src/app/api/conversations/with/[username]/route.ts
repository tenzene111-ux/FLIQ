import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const other = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!other) return jsonError("User not found", 404);
  if (other.id === user.id) return jsonError("You can't message yourself", 400);

  const blocked = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: other.id },
        { blockerId: other.id, blockedId: user.id },
      ],
    },
  });
  if (blocked) return jsonError("You can't message this user", 403);

  let convo = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      participants: { some: { userId: user.id } },
      AND: { participants: { some: { userId: other.id } } },
    },
  });

  if (!convo) {
    const otherSettings = await prisma.userSettings.findUnique({ where: { userId: other.id } });
    const isRequest = otherSettings?.allowMessagesFrom === "followers"
      ? !(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: other.id, followingId: user.id } } }))
      : false;

    convo = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: user.id }, { userId: other.id, isRequest }],
        },
      },
    });
  }

  return jsonOk({ conversationId: convo.id });
});
