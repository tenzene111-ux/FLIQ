import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { getProfileStats } from "@/lib/social";
import { logLiveEvent } from "@/lib/live-events";

const bodySchema = z.object({ liveStreamId: z.string().optional() });

async function resolveTarget(username: string) {
  return prisma.user.findUnique({ where: { username: username.toLowerCase() } });
}

export const POST = withAuth<{ username: string }>(async (req, { user, params }) => {
  const body = await req.json().catch(() => null);
  const { liveStreamId } = bodySchema.safeParse(body).data ?? {};

  const target = await resolveTarget(params.username);
  if (!target) return jsonError("User not found", 404);
  if (target.id === user.id) return jsonError("You can't follow yourself", 400);

  const blocked = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: target.id },
        { blockerId: target.id, blockedId: user.id },
      ],
    },
  });
  if (blocked) return jsonError("You can't follow this account", 403);

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
  });
  if (existing?.status === "accepted") {
    const stats = await getProfileStats(target.id);
    return jsonOk({ status: "accepted", stats });
  }

  // Private accounts require the target's approval — everyone else is
  // followed immediately, same as before.
  const status = target.isPrivate ? "pending" : "accepted";

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
    create: { followerId: user.id, followingId: target.id, status },
    update: { status },
  });

  await prisma.notification.create({
    data: { recipientId: target.id, actorId: user.id, type: status === "pending" ? "follow_request" : "follow" },
  });

  if (liveStreamId) logLiveEvent(liveStreamId, "LIVE_FOLLOW", user.id);

  const stats = await getProfileStats(target.id);
  return jsonOk({ status, stats });
});

export const DELETE = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const target = await resolveTarget(params.username);
  if (!target) return jsonError("User not found", 404);

  // Also cancels a pending request the caller sent.
  await prisma.follow
    .delete({ where: { followerId_followingId: { followerId: user.id, followingId: target.id } } })
    .catch(() => {});

  const stats = await getProfileStats(target.id);
  return jsonOk({ status: "none", stats });
});
