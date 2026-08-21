import { prisma } from "@/lib/db";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { isOnline } from "@/lib/presence";

export const GET = withErrorHandling<{ username: string }>(async (_req, { params }) => {
  const user = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() }, select: { id: true } });
  if (!user) return jsonError("User not found", 404);
  return jsonOk({ online: isOnline(user.id) });
});
