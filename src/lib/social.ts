import { prisma } from "@/lib/db";

export async function getProfileStats(userId: string) {
  const [followerRows, followingRows, analytics, likeAgg] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    prisma.creatorAnalytics.findUnique({ where: { userId } }),
    prisma.like.count({ where: { video: { userId } } }),
  ]);

  return {
    followers: followerRows + (analytics?.followerBoost ?? 0),
    following: followingRows,
    likes: (analytics?.totalLikes ?? 0) + likeAgg,
  };
}

export async function isFollowing(followerId: string, followingId: string) {
  if (followerId === followingId) return false;
  const row = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  return !!row;
}

export async function getFollowingIdSet(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  return new Set(rows.map((r) => r.followingId));
}
