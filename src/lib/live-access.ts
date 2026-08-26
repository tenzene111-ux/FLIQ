import { prisma } from "@/lib/db";

export type LiveRole = "creator" | "moderator" | "co-host" | "viewer";
export type LivePermission = "delete" | "mute" | "pin";

/** Real-time-ish role resolution for a LIVE room. Creator always has every permission. */
export async function getLiveRole(liveStreamId: string, userId: string | null | undefined, hostUserId: string): Promise<LiveRole> {
  if (!userId) return "viewer";
  if (userId === hostUserId) return "creator";
  const [moderator, participant] = await Promise.all([
    prisma.liveModerator.findUnique({ where: { liveStreamId_userId: { liveStreamId, userId } } }),
    prisma.liveParticipant.findUnique({ where: { liveStreamId_userId: { liveStreamId, userId } } }),
  ]);
  if (moderator) return "moderator";
  if (participant?.status === "accepted" && !participant.leftAt) return "co-host";
  return "viewer";
}

export async function hasLivePermission(liveStreamId: string, userId: string | null | undefined, hostUserId: string, permission: LivePermission): Promise<boolean> {
  if (!userId) return false;
  if (userId === hostUserId) return true;
  const moderator = await prisma.liveModerator.findUnique({ where: { liveStreamId_userId: { liveStreamId, userId } } });
  if (!moderator) return false;
  const permissions: string[] = JSON.parse(moderator.permissions || "[]");
  return permissions.includes(permission);
}
