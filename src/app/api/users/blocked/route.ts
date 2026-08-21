import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";

export const GET = withAuth(async (_req, { user }) => {
  const rows = await prisma.blockedUser.findMany({
    where: { blockerId: user.id },
    include: { blocked: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk({ users: rows.map((r) => r.blocked) });
});
