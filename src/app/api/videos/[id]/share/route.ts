import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({ target: z.enum(["link", "external"]).default("link") });

// Records a share for analytics/notification purposes when a video's link is
// copied or handed off to the native share sheet. Sending directly to a Fliq
// user goes through /api/messages/share instead, which creates a real message.
export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return jsonError("Video not found", 404);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const target = parsed.success ? parsed.data.target : "link";

  await prisma.share.create({ data: { userId: user.id, videoId: video.id, target } });

  if (video.userId !== user.id) {
    await prisma.notification.create({ data: { recipientId: video.userId, actorId: user.id, type: "share", videoId: video.id } });
  }

  return jsonOk({ ok: true, link: `/video/${video.id}` });
});
