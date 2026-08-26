"use client";

// Fire-and-forget instrumentation for the Create funnel — lets us see where
// people actually drop off (spec section 26). Never blocks or throws on the
// caller; a dropped analytics beacon should never break content creation.

export type CreateEventType =
  | "CREATE_OPENED"
  | "CREATE_VIDEO_SELECTED"
  | "CREATE_PHOTO_SELECTED"
  | "CREATE_LIVE_SELECTED"
  | "LIVE_SETUP_OPENED"
  | "CAMERA_OPENED"
  | "RECORD_STARTED"
  | "RECORD_COMPLETED"
  | "VIDEO_UPLOADED"
  | "EDITOR_OPENED"
  | "VIDEO_TRIMMED"
  | "FILTER_USED"
  | "SOUND_SELECTED"
  | "TEXT_ADDED"
  | "STICKER_ADDED"
  | "DRAFT_SAVED"
  | "POST_STARTED"
  | "POST_PUBLISHED"
  | "POST_FAILED"
  | "POST_CANCELLED";

export function trackCreateEvent(type: CreateEventType, meta?: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ type, meta });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    // analytics must never break the create flow
  }
}
