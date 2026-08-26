import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { pushLiveEvent } from "@/lib/live-chat";
import { logLiveEvent } from "@/lib/live-events";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream
    .update({
      where: { id: params.id },
      data: {
        viewerCount: { increment: 1 },
        totalViewers: { increment: 1 },
      },
    })
    .catch(() => null);
  if (!stream) return jsonError("Live stream not found", 404);

  if (stream.viewerCount > stream.peakViewerCount) {
    await prisma.liveStream.update({ where: { id: stream.id }, data: { peakViewerCount: stream.viewerCount } }).catch(() => {});
  }

  if (stream.userId !== user.id) {
    pushLiveEvent(stream.id, { type: "join", userId: user.id, username: user.username, avatarUrl: user.avatarUrl });
    logLiveEvent(stream.id, "LIVE_VIEWER_JOINED", user.id);
  }

  return jsonOk({ viewerCount: stream.viewerCount });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream
    .update({ where: { id: params.id }, data: { viewerCount: { decrement: 1 } } })
    .catch(() => null);
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.userId !== user.id) logLiveEvent(stream.id, "LIVE_VIEWER_LEFT", user.id);
  return jsonOk({ viewerCount: Math.max(0, stream.viewerCount) });
});
