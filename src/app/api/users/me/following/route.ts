import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";

export const GET = withAuth(async (_req, { user }) => {
  const rows = await prisma.follow.findMany({
    where: { followerId: user.id },
    include: { following: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return jsonOk({ users: rows.map((r) => r.following) });
});
