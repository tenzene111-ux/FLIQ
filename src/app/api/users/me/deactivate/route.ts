import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { clearSession } from "@/lib/auth";

export const POST = withAuth(async (_req, { user }) => {
  await prisma.user.update({ where: { id: user.id }, data: { status: "deactivated" } });
  await clearSession();
  return jsonOk({ ok: true });
});
