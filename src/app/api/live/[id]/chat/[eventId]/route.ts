import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { deleteLiveEvent } from "@/lib/live-chat";
import { hasLivePermission } from "@/lib/live-access";

export const DELETE = withAuth<{ id: string; eventId: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);

  const allowed = await hasLivePermission(stream.id, user.id, stream.userId, "delete");
  if (!allowed) return jsonError("You don't have permission to delete this message", 403);

  const ok = deleteLiveEvent(stream.id, params.eventId);
  if (!ok) return jsonError("Message not found", 404);
  return jsonOk({ ok: true });
});
