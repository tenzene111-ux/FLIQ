import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { videoInclude, serializeVideo } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";

export const GET = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const collection = await prisma.collection.findUnique({ where: { id: params.id } });
  if (!collection || collection.userId !== user.id) return jsonError("Collection not found", 404);

  const followingIds = await getFollowingIdSet(user.id);
  const items = await prisma.collectionItem.findMany({
    where: { collectionId: collection.id, video: { status: "published" } },
    include: { video: { include: videoInclude(user.id) } },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    collection: { id: collection.id, name: collection.name },
    videos: items.map((i) => serializeVideo(i.video, followingIds)),
  });
});

const schema = z.object({ name: z.string().min(1).max(40) });

export const PATCH = withAuth<{ id: string }>(async (req, { user, params }) => {
  const collection = await prisma.collection.findUnique({ where: { id: params.id } });
  if (!collection || collection.userId !== user.id) return jsonError("Collection not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Give your collection a name", 422);

  const updated = await prisma.collection.update({ where: { id: collection.id }, data: { name: parsed.data.name } });
  return jsonOk({ collection: { id: updated.id, name: updated.name } });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const collection = await prisma.collection.findUnique({ where: { id: params.id } });
  if (!collection || collection.userId !== user.id) return jsonError("Collection not found", 404);
  await prisma.collection.delete({ where: { id: collection.id } });
  return jsonOk({ ok: true });
});
