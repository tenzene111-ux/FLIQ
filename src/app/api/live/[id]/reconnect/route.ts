import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { logLiveEvent } from "@/lib/live-events";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.userId !== user.id) return jsonError("Only the host can report a reconnect", 403);
  await logLiveEvent(stream.id, "LIVE_RECONNECT", user.id);
  return jsonOk({ ok: true });
});
