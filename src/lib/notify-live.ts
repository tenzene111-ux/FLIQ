import { prisma } from "@/lib/db";

const RATE_LIMIT_HOURS = 2;

/** "@creator is live now" — rate-limited so a creator can't spam followers by ending/restarting. */
export async function notifyFollowersLive(creatorId: string, liveStreamId: string) {
  const followers = await prisma.follow.findMany({ where: { followingId: creatorId, status: "accepted" }, select: { followerId: true } });
  if (followers.length === 0) return;
  const followerIds = followers.map((f) => f.followerId);

  const cutoff = new Date(Date.now() - RATE_LIMIT_HOURS * 60 * 60 * 1000);
  const [settingsRows, recentlyNotified] = await Promise.all([
    prisma.userSettings.findMany({ where: { userId: { in: followerIds } }, select: { userId: true, pushLive: true } }),
    prisma.notification.findMany({
      where: { type: "live", actorId: creatorId, recipientId: { in: followerIds }, createdAt: { gte: cutoff } },
      select: { recipientId: true },
    }),
  ]);

  const disabled = new Set(settingsRows.filter((s) => !s.pushLive).map((s) => s.userId));
  const alreadyNotified = new Set(recentlyNotified.map((n) => n.recipientId));
  const eligible = followerIds.filter((id) => !disabled.has(id) && !alreadyNotified.has(id));
  if (eligible.length === 0) return;

  await prisma.notification.createMany({
    data: eligible.map((recipientId) => ({ recipientId, actorId: creatorId, type: "live", liveStreamId })),
  });
}

/** Notify people who set a reminder on a scheduled LIVE, once, when it actually goes live. */
export async function notifyReminders(liveStreamId: string, creatorId: string): Promise<number> {
  const reminders = await prisma.liveReminder.findMany({ where: { liveStreamId }, select: { userId: true } });
  if (reminders.length === 0) return 0;
  const userIds = reminders.map((r) => r.userId).filter((id) => id !== creatorId);
  if (userIds.length === 0) return 0;

  const settingsRows = await prisma.userSettings.findMany({ where: { userId: { in: userIds } }, select: { userId: true, pushLive: true } });
  const disabled = new Set(settingsRows.filter((s) => !s.pushLive).map((s) => s.userId));
  const eligible = userIds.filter((id) => !disabled.has(id));
  if (eligible.length === 0) return 0;

  await prisma.notification.createMany({
    data: eligible.map((recipientId) => ({ recipientId, actorId: creatorId, type: "live", liveStreamId })),
  });
  return eligible.length;
}
