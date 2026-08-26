import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { pushLiveEvent } from "@/lib/live-chat";
import { logLiveEvent } from "@/lib/live-events";

const schema = z.object({ accept: z.boolean() });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const invite = await prisma.liveParticipant.findUnique({ where: { liveStreamId_userId: { liveStreamId: params.id, userId: user.id } } });
  if (!invite || invite.status !== "invited") return jsonError("No pending invite for this live", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid response", 422);

  if (!parsed.data.accept) {
    const updated = await prisma.liveParticipant.update({ where: { id: invite.id }, data: { status: "declined" } });
    return jsonOk({ participant: updated });
  }

  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream || stream.status !== "live") return jsonError("This live has ended", 400);

  const activeCount = await prisma.liveParticipant.count({ where: { liveStreamId: params.id, status: "accepted", leftAt: null } });
  if (activeCount >= stream.maxGuests) return jsonError(`This live already has the maximum of ${stream.maxGuests} guests`, 422);

  const updated = await prisma.liveParticipant.update({ where: { id: invite.id }, data: { status: "accepted", joinedAt: new Date() } });
  pushLiveEvent(params.id, { type: "join", userId: user.id, username: user.username, avatarUrl: user.avatarUrl, text: "joined as a guest" });
  await logLiveEvent(params.id, "LIVE_GUEST_JOINED", user.id);

  return jsonOk({ participant: updated });
});
