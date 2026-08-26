import { prisma } from "@/lib/db";

export type LiveEventType =
  | "LIVE_SETUP_OPENED"
  | "LIVE_STARTED"
  | "LIVE_VIEWER_JOINED"
  | "LIVE_VIEWER_LEFT"
  | "LIVE_COMMENT"
  | "LIVE_REACTION"
  | "LIVE_FOLLOW"
  | "LIVE_SHARE"
  | "LIVE_GIFT"
  | "LIVE_GUEST_INVITED"
  | "LIVE_GUEST_JOINED"
  | "LIVE_GUEST_LEFT"
  | "LIVE_RECONNECT"
  | "LIVE_REPORTED"
  | "LIVE_ENDED"
  | "LIVE_SCHEDULED"
  | "LIVE_REMINDER_SET";

export function logLiveEvent(liveStreamId: string, eventType: LiveEventType, userId?: string | null, meta?: Record<string, unknown>) {
  return prisma.liveEvent
    .create({
      data: { liveStreamId, eventType, userId: userId ?? undefined, meta: meta ? JSON.stringify(meta) : undefined },
    })
    .catch(() => {});
}
