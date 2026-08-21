import { prisma } from "@/lib/db";
import { getCurrentUser, PUBLIC_USER_SELECT } from "@/lib/auth";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { getFollowingIdSet } from "@/lib/social";

export const GET = withErrorHandling(async () => {
  const viewer = await getCurrentUser();
  const followingIds = await getFollowingIdSet(viewer?.id);

  const users = await prisma.user.findMany({
    where: {
      status: "active",
      id: { notIn: [...followingIds, viewer?.id].filter(Boolean) as string[] },
    },
    select: { ...PUBLIC_USER_SELECT, analytics: { select: { followerBoost: true } } },
    orderBy: { createdAt: "asc" },
    take: 12,
  });

  const withFollowers = await Promise.all(
    users.map(async (u) => {
      const real = await prisma.follow.count({ where: { followingId: u.id } });
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        bio: u.bio,
        avatarUrl: u.avatarUrl,
        isVerified: u.isVerified,
        isCreator: u.isCreator,
        isPrivate: u.isPrivate,
        followerCount: real + (u.analytics?.followerBoost ?? 0),
      };
    })
  );

  return jsonOk({ users: withFollowers });
});
