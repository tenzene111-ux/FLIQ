import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return jsonError("Video not found", 404);

  await prisma.like.upsert({
    where: { userId_videoId: { userId: user.id, videoId: video.id } },
    create: { userId: user.id, videoId: video.id },
    update: {},
  });

  if (video.userId !== user.id) {
    await prisma.notification.create({
      data: { recipientId: video.userId, actorId: user.id, type: "like", videoId: video.id },
    });
  }

  return jsonOk({ liked: true });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  await prisma.like.delete({ where: { userId_videoId: { userId: user.id, videoId: params.id } } }).catch(() => {});
  return jsonOk({ liked: false });
});
