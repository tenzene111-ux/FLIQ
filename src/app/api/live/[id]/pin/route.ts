import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { setPinnedMessage, clearPinnedMessage } from "@/lib/live-chat";
import { hasLivePermission } from "@/lib/live-access";

const schema = z.object({ eventId: z.string().min(1) });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);

  const allowed = await hasLivePermission(stream.id, user.id, stream.userId, "pin");
  if (!allowed) return jsonError("You don't have permission to pin messages", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Missing message", 422);

  const pinned = setPinnedMessage(stream.id, parsed.data.eventId);
  if (!pinned) return jsonError("Message not found", 404);

  await prisma.liveStream.update({ where: { id: stream.id }, data: { pinnedMessageId: pinned.id } }).catch(() => {});
  return jsonOk({ pinnedMessage: pinned });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);

  const allowed = await hasLivePermission(stream.id, user.id, stream.userId, "pin");
  if (!allowed) return jsonError("You don't have permission to unpin messages", 403);

  clearPinnedMessage(stream.id);
  await prisma.liveStream.update({ where: { id: stream.id }, data: { pinnedMessageId: null } }).catch(() => {});
  return jsonOk({ ok: true });
});
