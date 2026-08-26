import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { logLiveEvent } from "@/lib/live-events";

const schema = z.object({ username: z.string().min(1) });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.userId !== user.id) return jsonError("Only the host can invite guests", 403);
  if (stream.status !== "live") return jsonError("This live isn't active", 400);
  if (!stream.guestsEnabled) return jsonError("Guests are turned off for this live", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Missing username", 422);

  const target = await prisma.user.findUnique({ where: { username: parsed.data.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);
  if (target.id === user.id) return jsonError("You're already hosting", 400);

  const blocked = await prisma.blockedUser.findFirst({
    where: { OR: [{ blockerId: user.id, blockedId: target.id }, { blockerId: target.id, blockedId: user.id }] },
  });
  if (blocked) return jsonError("You can't invite this user", 403);

  const activeCount = await prisma.liveParticipant.count({ where: { liveStreamId: stream.id, status: "accepted", leftAt: null } });
  if (activeCount >= stream.maxGuests) return jsonError(`This live already has the maximum of ${stream.maxGuests} guests`, 422);

  const existing = await prisma.liveParticipant.findUnique({ where: { liveStreamId_userId: { liveStreamId: stream.id, userId: target.id } } });
  if (existing && (existing.status === "invited" || existing.status === "accepted")) {
    return jsonError("This user already has a pending or active invite", 409);
  }

  const participant = await prisma.liveParticipant.upsert({
    where: { liveStreamId_userId: { liveStreamId: stream.id, userId: target.id } },
    create: { liveStreamId: stream.id, userId: target.id, status: "invited" },
    update: { status: "invited", joinedAt: null, leftAt: null },
  });

  await prisma.notification.create({
    data: { recipientId: target.id, actorId: user.id, type: "live_guest_invite", liveStreamId: stream.id },
  });
  await logLiveEvent(stream.id, "LIVE_GUEST_INVITED", target.id);

  return jsonOk({ participant }, 201);
});
