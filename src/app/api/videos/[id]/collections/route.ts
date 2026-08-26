import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";

export const GET = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const items = await prisma.collectionItem.findMany({
    where: { videoId: params.id, collection: { userId: user.id } },
    select: { collectionId: true },
  });
  return jsonOk({ collectionIds: items.map((i) => i.collectionId) });
});
