import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { clearLiveEvents } from "@/lib/live-chat";
import { logLiveEvent } from "@/lib/live-events";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.userId !== user.id) return jsonError("Only the host can end this live", 403);

  const endedAt = new Date();
  const [updated] = await prisma.$transaction([
    prisma.liveStream.update({ where: { id: stream.id }, data: { status: "ended", endedAt } }),
    prisma.liveParticipant.updateMany({ where: { liveStreamId: stream.id, status: "accepted", leftAt: null }, data: { leftAt: endedAt, status: "left" } }),
  ]);

  const [uniqueViewerRows, newFollowers] = await Promise.all([
    prisma.liveEvent.findMany({ where: { liveStreamId: stream.id, eventType: "LIVE_VIEWER_JOINED" }, distinct: ["userId"], select: { userId: true } }),
    prisma.follow.count({ where: { followingId: user.id, status: "accepted", createdAt: { gte: stream.startedAt, lte: endedAt } } }),
  ]);

  await logLiveEvent(stream.id, "LIVE_ENDED", user.id);
  clearLiveEvents(stream.id);

  const durationSec = Math.max(0, Math.round((endedAt.getTime() - stream.startedAt.getTime()) / 1000));

  return jsonOk({
    ok: true,
    summary: {
      durationSec,
      peakViewerCount: updated.peakViewerCount,
      totalViewers: updated.totalViewers,
      uniqueViewers: uniqueViewerRows.filter((r) => r.userId).length,
      chatCount: updated.chatCount,
      reactionCount: updated.reactionCount,
      newFollowers,
      coinsEarned: updated.coinsEarned,
    },
  });
});
