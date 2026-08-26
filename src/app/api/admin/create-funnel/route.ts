import { prisma } from "@/lib/db";
import { withAdmin, jsonOk } from "@/lib/api";

const FUNNEL_ORDER = [
  "CREATE_OPENED",
  "CREATE_VIDEO_SELECTED",
  "CREATE_PHOTO_SELECTED",
  "CREATE_LIVE_SELECTED",
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
];

export const GET = withAdmin(async (req) => {
  const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 7));
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await prisma.createEvent.groupBy({
    by: ["type"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  const counts = new Map(rows.map((r) => [r.type, r._count._all]));
  const funnel = FUNNEL_ORDER.map((type) => ({ type, count: counts.get(type) ?? 0 }));
  const opened = counts.get("CREATE_OPENED") ?? 0;
  const published = counts.get("POST_PUBLISHED") ?? 0;

  return jsonOk({ days, funnel, opened, published, conversionRate: opened > 0 ? published / opened : 0 });
});
