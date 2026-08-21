import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { getProfileStats } from "@/lib/social";

async function resolveTarget(username: string) {
  return prisma.user.findUnique({ where: { username: username.toLowerCase() } });
}

export const POST = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const target = await resolveTarget(params.username);
  if (!target) return jsonError("User not found", 404);
  if (target.id === user.id) return jsonError("You can't follow yourself", 400);

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
    create: { followerId: user.id, followingId: target.id },
    update: {},
  });

  await prisma.notification.create({
    data: { recipientId: target.id, actorId: user.id, type: "follow" },
  });

  const stats = await getProfileStats(target.id);
  return jsonOk({ following: true, stats });
});

export const DELETE = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const target = await resolveTarget(params.username);
  if (!target) return jsonError("User not found", 404);

  await prisma.follow
    .delete({ where: { followerId_followingId: { followerId: user.id, followingId: target.id } } })
    .catch(() => {});

  const stats = await getProfileStats(target.id);
  return jsonOk({ following: false, stats });
});
