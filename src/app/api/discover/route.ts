import { prisma } from "@/lib/db";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { serializeSound } from "@/lib/serialize";
import { CATEGORIES, CATEGORY_HASHTAGS } from "@/lib/constants";

export const GET = withErrorHandling(async () => {
  const [hashtags, users, sounds] = await Promise.all([
    prisma.hashtag.findMany({ orderBy: { viewCount: "desc" }, take: 6, include: { _count: { select: { videos: true } } } }),
    prisma.user.findMany({
      where: { status: "active" },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
        bio: true,
        analytics: { select: { followerBoost: true } },
      },
      take: 30,
    }),
    prisma.sound.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const usersWithFollowers = await Promise.all(
    users.map(async (u) => {
      const real = await prisma.follow.count({ where: { followingId: u.id } });
      return { ...u, followerCount: real + (u.analytics?.followerBoost ?? 0) };
    })
  );
  usersWithFollowers.sort((a, b) => b.followerCount - a.followerCount);

  const hashtagThumbs = await Promise.all(
    hashtags.map(async (h) => {
      const sample = await prisma.video.findMany({
        where: { hashtags: { some: { hashtagId: h.id } } },
        select: { thumbnailUrl: true },
        take: 3,
      });
      return {
        tag: h.tag,
        viewCount: h.viewCount,
        videoCount: h._count.videos,
        thumbnails: sample.map((s) => s.thumbnailUrl),
      };
    })
  );

  const categoriesWithCounts = await Promise.all(
    CATEGORIES.map(async (c) => {
      const tags = CATEGORY_HASHTAGS[c.slug];
      const count = await prisma.video.count({ where: { hashtags: { some: { hashtag: { tag: { in: tags } } } } } });
      return { ...c, videoCount: count };
    })
  );

  return jsonOk({
    hashtags: hashtagThumbs,
    creators: usersWithFollowers.slice(0, 8).map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      isVerified: u.isVerified,
      bio: u.bio,
      followerCount: u.followerCount,
    })),
    categories: categoriesWithCounts,
    sounds: sounds.map(serializeSound),
  });
});
