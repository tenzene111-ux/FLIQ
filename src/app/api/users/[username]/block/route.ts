import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);
  if (target.id === user.id) return jsonError("You can't block yourself", 400);

  await prisma.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: target.id } },
    create: { blockerId: user.id, blockedId: target.id },
    update: {},
  });
  await prisma.follow.deleteMany({
    where: { OR: [{ followerId: user.id, followingId: target.id }, { followerId: target.id, followingId: user.id }] },
  });

  return jsonOk({ blocked: true });
});

export const DELETE = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);

  await prisma.blockedUser.delete({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: target.id } } }).catch(() => {});
  return jsonOk({ blocked: false });
});
