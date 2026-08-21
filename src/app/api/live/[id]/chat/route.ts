import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { getLiveEventsSince, pushLiveEvent } from "@/lib/live-chat";

export const GET = withAuth<{ id: string }>(async (req: NextRequest, { params }) => {
  const since = req.nextUrl.searchParams.get("since");
  return jsonOk({ events: getLiveEventsSince(params.id, since) });
});

const schema = z.object({ type: z.enum(["chat", "reaction"]), text: z.string().max(300).optional(), emoji: z.string().max(8).optional() });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.status !== "live") return jsonError("This live has ended", 400);
  if (stream.userId !== user.id && !stream.commentsOn) return jsonError("Comments are off for this live", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid message", 422);

  const event = pushLiveEvent(params.id, {
    type: parsed.data.type,
    userId: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    text: parsed.data.text,
    emoji: parsed.data.emoji,
  });

  return jsonOk({ event }, 201);
});
