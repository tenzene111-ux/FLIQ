import { prisma } from "@/lib/db";
import { getCurrentUser, PUBLIC_USER_SELECT } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { getProfileStats, isFollowing } from "@/lib/social";

export const GET = withErrorHandling<{ username: string }>(async (_req, { params }) => {
  const target = await prisma.user.findUnique({
    where: { username: params.username.toLowerCase() },
    select: { ...PUBLIC_USER_SELECT, website: true },
  });
  if (!target) return jsonError("User not found", 404);

  const viewer = await getCurrentUser();
  const [stats, following] = await Promise.all([
    getProfileStats(target.id),
    viewer ? isFollowing(viewer.id, target.id) : Promise.resolve(false),
  ]);

  return jsonOk({
    user: { ...target, isOwn: viewer?.id === target.id },
    stats,
    isFollowing: following,
  });
});
