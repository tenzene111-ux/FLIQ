import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const DELETE = withAuth<{ id: string; username: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.userId !== user.id) return jsonError("Only the host can remove moderators", 403);

  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);

  await prisma.liveModerator.deleteMany({ where: { liveStreamId: stream.id, userId: target.id } });
  return jsonOk({ ok: true });
});
