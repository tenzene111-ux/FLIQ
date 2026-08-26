import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { PUBLIC_USER_SELECT, getCurrentUser } from "@/lib/auth";
import { logLiveEvent } from "@/lib/live-events";
import { notifyFollowersLive } from "@/lib/notify-live";

export const GET = withErrorHandling(async (req) => {
  const viewer = await getCurrentUser();
  const statusParam = req.nextUrl.searchParams.get("status") || "live";
  const mutedIds = viewer ? (await prisma.mutedUser.findMany({ where: { userId: viewer.id }, select: { mutedId: true } })).map((m) => m.mutedId) : [];

  if (statusParam === "scheduled") {
    const streams = await prisma.liveStream.findMany({
      where: { status: "scheduled", scheduledFor: { gte: new Date() }, ...(mutedIds.length ? { userId: { notIn: mutedIds } } : {}) },
      include: { user: { select: PUBLIC_USER_SELECT } },
      orderBy: { scheduledFor: "asc" },
      take: 50,
    });
    return jsonOk({ streams });
  }

  const streams = await prisma.liveStream.findMany({
    where: { status: "live", ...(mutedIds.length ? { userId: { notIn: mutedIds } } : {}) },
    include: { user: { select: PUBLIC_USER_SELECT } },
    orderBy: { startedAt: "desc" },
  });
  return jsonOk({ streams });
});

const schema = z.object({
  title: z.string().min(1).max(100),
  category: z.string().min(1).max(40),
  description: z.string().max(300).optional(),
  commentsOn: z.boolean().default(true),
  giftsEnabled: z.boolean().default(false),
  guestsEnabled: z.boolean().default(false),
  maxGuests: z.number().int().min(1).max(8).default(3),
  scheduledFor: z.string().datetime().optional(),
});

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Give your live stream a title and category", 422);
  const data = parsed.data;

  if (data.scheduledFor) {
    const when = new Date(data.scheduledFor);
    if (when.getTime() <= Date.now()) return jsonError("Pick a time in the future", 422);
    const scheduled = await prisma.liveStream.create({
      data: {
        userId: user.id,
        title: data.title,
        description: data.description,
        category: data.category,
        commentsOn: data.commentsOn,
        giftsEnabled: data.giftsEnabled,
        guestsEnabled: data.guestsEnabled,
        maxGuests: data.maxGuests,
        status: "scheduled",
        scheduledFor: when,
      },
    });
    await logLiveEvent(scheduled.id, "LIVE_SCHEDULED", user.id);
    return jsonOk({ stream: scheduled }, 201);
  }

  const existing = await prisma.liveStream.findFirst({ where: { userId: user.id, status: "live" } });
  if (existing) return jsonOk({ stream: existing }, 200);

  const stream = await prisma.liveStream.create({
    data: {
      userId: user.id,
      title: data.title,
      description: data.description,
      category: data.category,
      commentsOn: data.commentsOn,
      giftsEnabled: data.giftsEnabled,
      guestsEnabled: data.guestsEnabled,
      maxGuests: data.maxGuests,
      status: "live",
      viewerCount: 0,
    },
  });

  await logLiveEvent(stream.id, "LIVE_STARTED", user.id);
  notifyFollowersLive(user.id, stream.id).catch(() => {});

  return jsonOk({ stream }, 201);
});
