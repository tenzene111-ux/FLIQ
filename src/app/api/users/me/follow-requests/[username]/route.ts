import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const requester = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!requester) return jsonError("User not found", 404);

  const updated = await prisma.follow.updateMany({
    where: { followerId: requester.id, followingId: user.id, status: "pending" },
    data: { status: "accepted" },
  });
  if (updated.count === 0) return jsonError("No pending request from this user", 404);

  await prisma.notification.create({ data: { recipientId: requester.id, actorId: user.id, type: "follow" } });
  return jsonOk({ ok: true });
});

export const DELETE = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const requester = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!requester) return jsonError("User not found", 404);

  await prisma.follow.deleteMany({ where: { followerId: requester.id, followingId: user.id, status: "pending" } });
  return jsonOk({ ok: true });
});
