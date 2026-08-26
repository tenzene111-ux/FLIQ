import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { clearLiveEvents } from "@/lib/live-chat";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.userId !== user.id) return jsonError("Only the host can end this live", 403);

  const endedAt = new Date();
  const updated = await prisma.liveStream.update({
    where: { id: stream.id },
    data: { status: "ended", endedAt },
  });
  clearLiveEvents(stream.id);

  const durationSec = Math.max(0, Math.round((endedAt.getTime() - stream.startedAt.getTime()) / 1000));

  return jsonOk({
    ok: true,
    summary: {
      durationSec,
      peakViewerCount: updated.peakViewerCount,
      totalViewers: updated.totalViewers,
      chatCount: updated.chatCount,
      reactionCount: updated.reactionCount,
    },
  });
});
