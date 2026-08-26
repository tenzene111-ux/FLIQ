import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

export const GET = withAuth(async (_req, { user }) => {
  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    include: {
      items: { orderBy: { createdAt: "desc" }, take: 1, include: { video: { select: { thumbnailUrl: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return jsonOk({
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      count: c._count.items,
      coverUrl: c.items[0]?.video.thumbnailUrl ?? null,
    })),
  });
});

const schema = z.object({ name: z.string().min(1).max(40) });

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Give your collection a name", 422);

  const count = await prisma.collection.count({ where: { userId: user.id } });
  if (count >= 30) return jsonError("You've reached the limit of 30 collections", 422);

  const collection = await prisma.collection.create({ data: { userId: user.id, name: parsed.data.name } });
  return jsonOk({ collection: { id: collection.id, name: collection.name, count: 0, coverUrl: null } }, 201);
});
