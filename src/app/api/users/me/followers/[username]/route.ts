import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const DELETE = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const follower = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!follower) return jsonError("User not found", 404);
  await prisma.follow.deleteMany({ where: { followerId: follower.id, followingId: user.id } });
  return jsonOk({ ok: true });
});
