import { prisma } from "@/lib/db";
import { getCurrentUser, PUBLIC_USER_SELECT } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { getFollowingIdSet } from "@/lib/social";

export const GET = withErrorHandling<{ username: string }>(async (_req, { params }) => {
  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);

  const viewer = await getCurrentUser();
  const followingIds = await getFollowingIdSet(viewer?.id);

  const rows = await prisma.follow.findMany({
    where: { followerId: target.id },
    include: { following: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return jsonOk({
    users: rows.map((r) => ({ ...r.following, isFollowing: followingIds.has(r.following.id) })),
  });
});
