import { prisma } from "@/lib/db";
import { getCurrentUser, PUBLIC_USER_SELECT } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { getProfileStats, getFollowStatus } from "@/lib/social";

export const GET = withErrorHandling<{ username: string }>(async (_req, { params }) => {
  const target = await prisma.user.findUnique({
    where: { username: params.username.toLowerCase() },
    select: { ...PUBLIC_USER_SELECT, website: true },
  });
  if (!target) return jsonError("User not found", 404);

  const viewer = await getCurrentUser();
  const [stats, followStatus, liveStream, scheduledLive] = await Promise.all([
    getProfileStats(target.id),
    getFollowStatus(viewer?.id, target.id),
    prisma.liveStream.findFirst({ where: { userId: target.id, status: "live" }, select: { id: true } }),
    prisma.liveStream.findFirst({
      where: { userId: target.id, status: "scheduled", scheduledFor: { gte: new Date() } },
      orderBy: { scheduledFor: "asc" },
      select: { id: true, title: true, scheduledFor: true },
    }),
  ]);

  return jsonOk({
    user: { ...target, isOwn: viewer?.id === target.id },
    stats,
    followStatus,
    liveId: liveStream?.id ?? null,
    scheduledLive,
  });
});
