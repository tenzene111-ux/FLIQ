import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling, withAuth } from "@/lib/api";
import { commentInclude, serializeComment } from "@/lib/serialize";
import { extractMentions } from "@/lib/utils";

export const GET = withErrorHandling<{ id: string }>(async (req, { params }) => {
  const viewer = await getCurrentUser();
  const parentId = req.nextUrl.searchParams.get("parentId");

  const comments = await prisma.comment.findMany({
    where: { videoId: params.id, parentId: parentId || null },
    include: commentInclude(viewer?.id),
    orderBy: [{ isPinned: "desc" }, { createdAt: "asc" }],
  });

  return jsonOk({ comments: comments.map(serializeComment) });
});

const schema = z.object({ text: z.string().min(1).max(500), parentId: z.string().optional().nullable() });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return jsonError("Video not found", 404);
  if (!video.allowComments) return jsonError("Comments are turned off for this video", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Write something first", 422);

  const comment = await prisma.comment.create({
    data: { videoId: video.id, userId: user.id, text: parsed.data.text, parentId: parsed.data.parentId || null },
    include: commentInclude(user.id),
  });

  if (video.userId !== user.id) {
    await prisma.notification.create({
      data: { recipientId: video.userId, actorId: user.id, type: "comment", videoId: video.id, commentText: parsed.data.text },
    });
  }

  const mentions = extractMentions(parsed.data.text);
  if (mentions.length) {
    const mentioned = await prisma.user.findMany({ where: { username: { in: mentions } } });
    for (const m of mentioned) {
      if (m.id === user.id) continue;
      await prisma.notification.create({
        data: { recipientId: m.id, actorId: user.id, type: "mention", videoId: video.id, commentText: parsed.data.text },
      });
    }
  }

  return jsonOk({ comment: serializeComment(comment) }, 201);
});
