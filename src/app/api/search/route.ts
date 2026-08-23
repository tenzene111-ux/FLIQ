import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { videoInclude, serializeVideo, serializeSound } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const type = req.nextUrl.searchParams.get("type") || "top";

  if (!q) return jsonOk({ users: [], videos: [], hashtags: [], sounds: [] });

  const viewer = await getCurrentUser();
  const followingIds = await getFollowingIdSet(viewer?.id);
  const isTop = type === "top";
  const cleanTag = q.replace(/^#/, "");

  const [users, videos, hashtags, sounds] = await Promise.all([
    type === "users" || isTop
      ? prisma.user.findMany({
          where: {
            status: "active",
            OR: [{ username: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }],
          },
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true, bio: true, analytics: { select: { followerBoost: true } } },
          take: isTop ? 4 : 25,
        })
      : Promise.resolve([]),
    type === "videos" || isTop
      ? prisma.video.findMany({
          where: { status: "published", caption: { contains: q, mode: "insensitive" } },
          include: videoInclude(viewer?.id),
          take: isTop ? 6 : 30,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    type === "hashtags" || isTop
      ? prisma.hashtag.findMany({
          where: { tag: { contains: cleanTag, mode: "insensitive" } },
          take: isTop ? 4 : 25,
          orderBy: { viewCount: "desc" },
          include: { _count: { select: { videos: true } } },
        })
      : Promise.resolve([]),
    type === "sounds" || isTop
      ? prisma.sound.findMany({
          where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { artist: { contains: q, mode: "insensitive" } }] },
          take: isTop ? 4 : 25,
          include: { _count: { select: { videos: true } } },
        })
      : Promise.resolve([]),
  ]);

  const usersWithFollowers = await Promise.all(
    users.map(async (u) => {
      const real = await prisma.follow.count({ where: { followingId: u.id } });
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        isVerified: u.isVerified,
        bio: u.bio,
        followerCount: real + (u.analytics?.followerBoost ?? 0),
        isFollowing: followingIds.has(u.id),
      };
    })
  );

  return jsonOk({
    users: usersWithFollowers,
    videos: videos.map((v) => serializeVideo(v, followingIds)),
    hashtags: hashtags.map((h) => ({ tag: h.tag, viewCount: h.viewCount, videoCount: h._count.videos })),
    sounds: sounds.map((s) => ({ ...serializeSound(s), videoCount: s._count.videos })),
  });
});
