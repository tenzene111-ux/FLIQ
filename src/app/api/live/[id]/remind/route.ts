import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.status !== "scheduled") return jsonError("This live isn't scheduled anymore", 400);

  await prisma.liveReminder.upsert({
    where: { liveStreamId_userId: { liveStreamId: stream.id, userId: user.id } },
    create: { liveStreamId: stream.id, userId: user.id },
    update: {},
  });
  return jsonOk({ reminding: true });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  await prisma.liveReminder.deleteMany({ where: { liveStreamId: params.id, userId: user.id } });
  return jsonOk({ reminding: false });
});
