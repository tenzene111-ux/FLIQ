import { prisma } from "@/lib/db";
import { getCurrentUser, PUBLIC_USER_SELECT } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { getFollowStatus } from "@/lib/social";
import { getLiveRole } from "@/lib/live-access";
import { getPinnedMessage } from "@/lib/live-chat";

export const GET = withErrorHandling<{ id: string }>(async (_req, { params }) => {
  const stream = await prisma.liveStream.findUnique({
    where: { id: params.id },
    include: {
      user: { select: PUBLIC_USER_SELECT },
      participants: {
        where: { status: "accepted", leftAt: null },
        include: { user: { select: PUBLIC_USER_SELECT } },
      },
    },
  });
  if (!stream) return jsonError("Live stream not found", 404);

  const viewer = await getCurrentUser();
  const [followStatus, role] = await Promise.all([
    getFollowStatus(viewer?.id, stream.userId),
    getLiveRole(stream.id, viewer?.id, stream.userId),
  ]);

  return jsonOk({
    stream: {
      ...stream,
      isHost: viewer?.id === stream.userId,
      role,
      followStatus,
      pinnedMessage: getPinnedMessage(stream.id),
    },
  });
});
