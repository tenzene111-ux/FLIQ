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
 * Derives what to suppress in future recommendations from the videos a
 * viewer has marked "Not Interested" on: the exact videos (excluded
 * outright) plus the creators and hashtags behind them (down-weighted, so
 * similar content is pushed down rather than just that one video).
 */
export async function getNegativeSignal(userId: string) {
  const rows = await prisma.notInterested.findMany({
    where: { userId },
    select: {
      videoId: true,
      video: { select: { userId: true, hashtags: { select: { hashtag: { select: { tag: true } } } } } },
    },
  });

  const videoIds = new Set(rows.map((r) => r.videoId));
  const hashtagPenalty = new Map<string, number>();
  const creatorPenalty = new Map<string, number>();
  for (const r of rows) {
    creatorPenalty.set(r.video.userId, (creatorPenalty.get(r.video.userId) ?? 0) + 1);
    for (const h of r.video.hashtags) {
      const tag = h.hashtag.tag;
      hashtagPenalty.set(tag, (hashtagPenalty.get(tag) ?? 0) + 1);
    }
  }
  return { videoIds, hashtagPenalty, creatorPenalty };
}

/**
 * Rule-based text relevance for search: rewards how closely a candidate
 * string matches the query (exact > word match > prefix > substring) rather
 * than just "contains it somewhere." Not ML — a simple weighted tier score,
 * same spirit as the rest of Fliq's ranking.
 */
export function textRelevanceScore(text: string, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  const words = t.split(/[\s_-]+/).filter(Boolean);
  if (words.includes(q)) return 65;
  if (words.some((w) => w.startsWith(q))) return 50;
  if (t.includes(q)) return 30;
  return 0;
}

/** True if a video's caption or hashtags match any of the viewer's blocked keywords. */
export function matchesKeywordFilter(caption: string, hashtags: string[], filters: string[]): boolean {
  if (filters.length === 0) return false;
  const lowerCaption = caption.toLowerCase();
  const lowerHashtags = new Set(hashtags.map((h) => h.toLowerCase()));
  return filters.some((raw) => {
    const kw = raw.replace(/^#/, "").trim().toLowerCase();
    return kw.length > 0 && (lowerCaption.includes(kw) || lowerHashtags.has(kw));
  });
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
