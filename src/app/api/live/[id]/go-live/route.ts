import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { logLiveEvent } from "@/lib/live-events";
import { notifyFollowersLive, notifyReminders } from "@/lib/notify-live";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.userId !== user.id) return jsonError("Only the host can start this live", 403);
  if (stream.status !== "scheduled") return jsonError("This live has already started or ended", 400);

  const updated = await prisma.liveStream.update({
    where: { id: stream.id },
    data: { status: "live", startedAt: new Date(), viewerCount: 0 },
  });

  await logLiveEvent(stream.id, "LIVE_STARTED", user.id);
  notifyFollowersLive(user.id, stream.id).catch(() => {});
  notifyReminders(stream.id, user.id)
    .then((count) => (count > 0 ? prisma.liveStream.update({ where: { id: stream.id }, data: { reminderCount: count } }).catch(() => {}) : undefined))
    .catch(() => {});

  return jsonOk({ stream: updated });
});
