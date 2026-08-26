import { prisma } from "@/lib/db";

export async function getProfileStats(userId: string) {
  const [followerRows, followingRows, analytics, likeAgg] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId, status: "accepted" } }),
    prisma.follow.count({ where: { followerId: userId, status: "accepted" } }),
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
  return row?.status === "accepted";
}

/** "none" | "pending" | "accepted" — the requester's follow relationship to the target. */
export async function getFollowStatus(followerId: string | null | undefined, followingId: string): Promise<"none" | "pending" | "accepted"> {
  if (!followerId || followerId === followingId) return "none";
  const row = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId, followingId } } });
  return row?.status === "pending" ? "pending" : row ? "accepted" : "none";
}

export async function getFollowingIdSet(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.follow.findMany({ where: { followerId: userId, status: "accepted" }, select: { followingId: true } });
  return new Set(rows.map((r) => r.followingId));
}
