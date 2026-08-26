import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);
  if (target.id === user.id) return jsonError("You can't mute yourself", 400);

  await prisma.mutedUser.upsert({
    where: { userId_mutedId: { userId: user.id, mutedId: target.id } },
    create: { userId: user.id, mutedId: target.id },
    update: {},
  });
  return jsonOk({ muted: true });
});

export const DELETE = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);

  await prisma.mutedUser.delete({ where: { userId_mutedId: { userId: user.id, mutedId: target.id } } }).catch(() => {});
  return jsonOk({ muted: false });
});
