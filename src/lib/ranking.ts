import { prisma } from "@/lib/db";

/**
 * How much a viewer actually engages with each hashtag, from their real
 * behavior (likes weighted higher than completed watches) rather than the
 * static interests picked once at onboarding.
 */
export async function getHashtagAffinity(userId: string): Promise<Map<string, number>> {
  const [likes, views] = await Promise.all([
    prisma.like.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: { video: { select: { hashtags: { select: { hashtag: { select: { tag: true } } } } } } },
    }),
    prisma.videoView.findMany({
      where: { userId, completed: true },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: { video: { select: { hashtags: { select: { hashtag: { select: { tag: true } } } } } } },
    }),
  ]);

  const affinity = new Map<string, number>();
  const add = (tags: string[], weight: number) => {
    for (const tag of tags) affinity.set(tag, (affinity.get(tag) ?? 0) + weight);
  };
  for (const l of likes) add(l.video.hashtags.map((h) => h.hashtag.tag), 3);
  for (const v of views) add(v.video.hashtags.map((h) => h.hashtag.tag), 1);
  return affinity;
}

/**
 * Round-robins a scored page by author so the same creator doesn't appear
 * twice in a row. Only reorders within the given items — never changes
 * which videos are included, so pagination math elsewhere stays correct.
 */
export function diversifyByAuthor<T extends { dto: { user: { id: string } } }>(items: T[]): T[] {
  const groups = new Map<string, T[]>();
  const order: string[] = [];
  for (const item of items) {
    const id = item.dto.user.id;
    if (!groups.has(id)) {
      groups.set(id, []);
      order.push(id);
    }
    groups.get(id)!.push(item);
  }

  const result: T[] = [];
  let remaining = items.length;
  while (remaining > 0) {
    for (const id of order) {
      const group = groups.get(id)!;
      if (group.length) {
        result.push(group.shift()!);
        remaining--;
      }
    }
  }
  return result;
}
