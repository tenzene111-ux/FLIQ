import { prisma } from "@/lib/db";
import { withAdmin, jsonError, jsonOk } from "@/lib/api";

export const DELETE = withAdmin<{ id: string }>(async (_req, { user, params }) => {
  if (params.id === user.id) return jsonError("You can't delete your own account here", 400);
  await prisma.user.delete({ where: { id: params.id } }).catch(() => {
    throw new Error("User not found");
  });
  return jsonOk({ ok: true });
});
