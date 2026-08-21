import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const story = await prisma.story.findUnique({ where: { id: params.id } });
  if (!story) return jsonError("Story not found", 404);

  await prisma.storyView.upsert({
    where: { storyId_userId: { storyId: story.id, userId: user.id } },
    create: { storyId: story.id, userId: user.id },
    update: {},
  });

  return jsonOk({ ok: true });
});
