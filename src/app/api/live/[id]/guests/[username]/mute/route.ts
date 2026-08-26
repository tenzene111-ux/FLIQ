import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string; username: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.userId !== user.id) return jsonError("Only the host can mute a guest", 403);

  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);

  const updated = await prisma.liveParticipant.updateMany({
    where: { liveStreamId: stream.id, userId: target.id, status: "accepted" },
    data: { mutedByHost: true },
  });
  if (updated.count === 0) return jsonError("This user isn't an active guest", 404);
  return jsonOk({ mutedByHost: true });
});

export const DELETE = withAuth<{ id: string; username: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.userId !== user.id) return jsonError("Only the host can unmute a guest", 403);

  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);

  await prisma.liveParticipant.updateMany({
    where: { liveStreamId: stream.id, userId: target.id, status: "accepted" },
    data: { mutedByHost: false },
  });
  return jsonOk({ mutedByHost: false });
});
