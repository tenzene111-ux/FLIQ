import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return jsonError("Video not found", 404);
  if (!video.allowReuse) return jsonError("The creator has disabled reposts for this video", 403);

  await prisma.repost.upsert({
    where: { userId_videoId: { userId: user.id, videoId: video.id } },
    create: { userId: user.id, videoId: video.id },
    update: {},
  });

  if (video.userId !== user.id) {
    await prisma.notification.create({ data: { recipientId: video.userId, actorId: user.id, type: "share", videoId: video.id } });
  }

  return jsonOk({ reposted: true });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  await prisma.repost.delete({ where: { userId_videoId: { userId: user.id, videoId: params.id } } }).catch(() => {});
  return jsonOk({ reposted: false });
});
