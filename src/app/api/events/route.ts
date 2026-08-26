import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonOk, withErrorHandling } from "@/lib/api";

const CREATE_EVENT_TYPES = [
  "CREATE_OPENED",
  "CREATE_VIDEO_SELECTED",
  "CREATE_PHOTO_SELECTED",
  "CREATE_LIVE_SELECTED",
  "LIVE_SETUP_OPENED",
  "CAMERA_OPENED",
  "RECORD_STARTED",
  "RECORD_COMPLETED",
  "VIDEO_UPLOADED",
  "EDITOR_OPENED",
  "VIDEO_TRIMMED",
  "FILTER_USED",
  "SOUND_SELECTED",
  "TEXT_ADDED",
  "STICKER_ADDED",
  "DRAFT_SAVED",
  "POST_STARTED",
  "POST_PUBLISHED",
  "POST_FAILED",
  "POST_CANCELLED",
] as const;

const schema = z.object({
  type: z.enum(CREATE_EVENT_TYPES),
  meta: z.record(z.string(), z.unknown()).optional(),
});

// Fire-and-forget Create-funnel instrumentation. Anonymous beacons (sendBeacon
// has no auth header) are still recorded with userId=null — a real analytics
// pipeline still counts drop-off during onboarding/logged-out browsing.
export const POST = withErrorHandling(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonOk({ ok: true }); // never punish the client for a malformed beacon

  const user = await getCurrentUser().catch(() => null);
  await prisma.createEvent
    .create({
      data: {
        userId: user?.id,
        type: parsed.data.type,
        meta: parsed.data.meta ? JSON.stringify(parsed.data.meta) : undefined,
      },
    })
    .catch(() => {});

  return jsonOk({ ok: true });
});
