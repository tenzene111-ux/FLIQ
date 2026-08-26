import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({ videoId: z.string().min(1) });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const collection = await prisma.collection.findUnique({ where: { id: params.id } });
  if (!collection || collection.userId !== user.id) return jsonError("Collection not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Missing video", 422);

  const video = await prisma.video.findUnique({ where: { id: parsed.data.videoId } });
  if (!video) return jsonError("Video not found", 404);

  await prisma.collectionItem.upsert({
    where: { collectionId_videoId: { collectionId: collection.id, videoId: video.id } },
    create: { collectionId: collection.id, videoId: video.id },
    update: {},
  });
  return jsonOk({ ok: true });
});

export const DELETE = withAuth<{ id: string }>(async (req, { user, params }) => {
  const collection = await prisma.collection.findUnique({ where: { id: params.id } });
  if (!collection || collection.userId !== user.id) return jsonError("Collection not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Missing video", 422);

  await prisma.collectionItem.deleteMany({ where: { collectionId: collection.id, videoId: parsed.data.videoId } });
  return jsonOk({ ok: true });
});
