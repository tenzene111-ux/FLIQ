import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { getLiveEventsSince, pushLiveEvent, canPostMessage, bumpPendingReactionCount, ensureReactionFlushTimer } from "@/lib/live-chat";
import { logLiveEvent } from "@/lib/live-events";
import { matchesKeywordFilter } from "@/lib/ranking";

ensureReactionFlushTimer((counts) => {
  for (const [streamId, count] of counts) {
    prisma.liveStream.update({ where: { id: streamId }, data: { reactionCount: { increment: count } } }).catch(() => {});
  }
});

export const GET = withAuth<{ id: string }>(async (req: NextRequest, { params }) => {
  const since = req.nextUrl.searchParams.get("since");
  return jsonOk({ events: getLiveEventsSince(params.id, since) });
});

const schema = z.object({ type: z.enum(["chat", "reaction"]), text: z.string().max(300).optional(), emoji: z.string().max(8).optional() });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.status !== "live") return jsonError("This live has ended", 400);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid message", 422);

  if (parsed.data.type === "reaction") {
    bumpPendingReactionCount(params.id);
    const event = pushLiveEvent(params.id, {
      type: "reaction",
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      emoji: parsed.data.emoji,
    });
    return jsonOk({ event }, 201);
  }

  if (stream.userId !== user.id && !stream.commentsOn) return jsonError("Comments are off for this live", 403);

  const blocked = await prisma.blockedUser.findFirst({
    where: { OR: [{ blockerId: stream.userId, blockedId: user.id }, { blockerId: user.id, blockedId: stream.userId }] },
  });
  if (blocked && stream.userId !== user.id) return jsonError("You can't comment on this live", 403);

  if (stream.userId !== user.id && !canPostMessage(params.id, user.id, stream.slowModeSeconds)) {
    return jsonError(`Slow mode is on — wait a few seconds between messages`, 429);
  }

  const blockedKeywords: string[] = JSON.parse(stream.blockedKeywords || "[]");
  if (stream.userId !== user.id && matchesKeywordFilter(parsed.data.text ?? "", [], blockedKeywords)) {
    return jsonError("Your message contains a blocked word for this live", 422);
  }

  const event = pushLiveEvent(params.id, {
    type: "chat",
    userId: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    text: parsed.data.text,
  });

  await prisma.liveStream.update({ where: { id: params.id }, data: { chatCount: { increment: 1 } } }).catch(() => {});
  logLiveEvent(params.id, "LIVE_COMMENT", user.id);

  return jsonOk({ event }, 201);
});
