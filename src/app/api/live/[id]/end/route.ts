import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { clearLiveEvents } from "@/lib/live-chat";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.userId !== user.id) return jsonError("Only the host can end this live", 403);

  await prisma.liveStream.update({ where: { id: stream.id }, data: { status: "ended", endedAt: new Date() } });
  clearLiveEvents(stream.id);

  return jsonOk({ ok: true });
});
