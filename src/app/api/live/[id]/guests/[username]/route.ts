import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { logLiveEvent } from "@/lib/live-events";

export const DELETE = withAuth<{ id: string; username: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);

  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);

  // The host can remove any guest; a guest can remove themselves (leave).
  if (stream.userId !== user.id && user.id !== target.id) return jsonError("You can't remove this guest", 403);

  const updated = await prisma.liveParticipant.updateMany({
    where: { liveStreamId: stream.id, userId: target.id, status: "accepted" },
    data: { status: "left", leftAt: new Date() },
  });
  if (updated.count === 0) return jsonError("This user isn't an active guest", 404);

  await logLiveEvent(stream.id, "LIVE_GUEST_LEFT", target.id);
  return jsonOk({ ok: true });
});
