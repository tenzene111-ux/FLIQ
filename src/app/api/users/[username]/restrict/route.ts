import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);
  if (target.id === user.id) return jsonError("You can't restrict yourself", 400);

  await prisma.restrictedUser.upsert({
    where: { userId_restrictedId: { userId: user.id, restrictedId: target.id } },
    create: { userId: user.id, restrictedId: target.id },
    update: {},
  });
  return jsonOk({ restricted: true });
});

export const DELETE = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);

  await prisma.restrictedUser.delete({ where: { userId_restrictedId: { userId: user.id, restrictedId: target.id } } }).catch(() => {});
  return jsonOk({ restricted: false });
});
