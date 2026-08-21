import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({ target: z.enum(["link", "fliq_user", "external"]).default("link"), toUsername: z.string().optional() });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return jsonError("Video not found", 404);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const target = parsed.success ? parsed.data.target : "link";

  await prisma.share.create({ data: { userId: user.id, videoId: video.id, target } });

  if (target === "fliq_user" && parsed.success && parsed.data.toUsername) {
    const recipient = await prisma.user.findUnique({ where: { username: parsed.data.toUsername.toLowerCase() } });
    if (recipient) {
      let convo = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: { some: { userId: user.id } },
          AND: { participants: { some: { userId: recipient.id } } },
        },
      });
      if (!convo) {
        convo = await prisma.conversation.create({
          data: { participants: { create: [{ userId: user.id }, { userId: recipient.id }] } },
        });
      }
      await prisma.message.create({
        data: { conversationId: convo.id, senderId: user.id, type: "video", mediaUrl: video.id, text: video.caption },
      });
    }
  }

  if (video.userId !== user.id) {
    await prisma.notification.create({ data: { recipientId: video.userId, actorId: user.id, type: "share", videoId: video.id } });
  }

  return jsonOk({ ok: true, link: `/video/${video.id}` });
});
