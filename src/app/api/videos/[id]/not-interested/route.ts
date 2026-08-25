import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  await prisma.notInterested.upsert({
    where: { userId_videoId: { userId: user.id, videoId: params.id } },
    create: { userId: user.id, videoId: params.id },
    update: {},
  });
  return jsonOk({ ok: true });
});
