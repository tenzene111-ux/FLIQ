import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, PUBLIC_USER_SELECT } from "@/lib/auth";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { videoInclude, serializeVideo, serializeSound } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";
import { textRelevanceScore } from "@/lib/ranking";

const EMPTY = { users: [], videos: [], photos: [], hashtags: [], sounds: [], live: [] };

export const GET = withErrorHandling(async (req: NextRequest) => {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const type = req.nextUrl.searchParams.get("type") || "top";

  if (!q) return jsonOk(EMPTY);

  const viewer = await getCurrentUser();
  const followingIds = await getFollowingIdSet(viewer?.id);
  const isTop = type === "top";
  const cleanTag = q.replace(/^#/, "");
  const wantUsers = type === "users" || isTop;
  const wantVideos = type === "videos" || isTop;
  const wantPhotos = type === "photos" || isTop;
  const wantHashtags = type === "hashtags" || isTop;
  const wantSounds = type === "sounds" || isTop;
  const wantLive = type === "live" || isTop;

  const postWhere = (postType: "video" | "photo") => ({
    status: "published",
    postType,
    OR: [
      { caption: { contains: q, mode: "insensitive" as const } },
      { hashtags: { some: { hashtag: { tag: { contains: cleanTag, mode: "insensitive" as const } } } } },
    ],
  });

  const [users, rawVideos, rawPhotos, hashtags, sounds, live] = await Promise.all([
    wantUsers
      ? prisma.user.findMany({
          where: {
            status: "active",
            OR: [{ username: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }],
          },
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true, bio: true, analytics: { select: { followerBoost: true } } },
          take: isTop ? 15 : 60,
        })
      : Promise.resolve([]),
    wantVideos
      ? prisma.video.findMany({ where: postWhere("video"), include: videoInclude(viewer?.id), take: isTop ? 20 : 60 })
      : Promise.resolve([]),
    wantPhotos
      ? prisma.video.findMany({ where: postWhere("photo"), include: videoInclude(viewer?.id), take: isTop ? 20 : 60 })
      : Promise.resolve([]),
    wantHashtags
      ? prisma.hashtag.findMany({
          where: { tag: { contains: cleanTag, mode: "insensitive" } },
          take: isTop ? 15 : 60,
          include: { _count: { select: { videos: true } } },
        })
      : Promise.resolve([]),
    wantSounds
      ? prisma.sound.findMany({
          where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { artist: { contains: q, mode: "insensitive" } }] },
          take: isTop ? 15 : 60,
          include: { _count: { select: { videos: true } } },
        })
      : Promise.resolve([]),
    wantLive
      ? prisma.liveStream.findMany({
          where: {
            status: "live",
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { user: { username: { contains: q, mode: "insensitive" } } },
            ],
          },
          include: { user: { select: PUBLIC_USER_SELECT } },
          take: isTop ? 10 : 60,
        })
      : Promise.resolve([]),
  ]);

  // --- Users: relevance on handle/name, weighted by real follower count + verification ---
  const scoredUsers = await Promise.all(
    users.map(async (u) => {
      const real = await prisma.follow.count({ where: { followingId: u.id } });
      const followerCount = real + (u.analytics?.followerBoost ?? 0);
      const value = {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        isVerified: u.isVerified,
        bio: u.bio,
        followerCount,
        isFollowing: followingIds.has(u.id),
      };
      const score = textRelevanceScore(u.username, q) * 1.15 + textRelevanceScore(u.displayName, q) + Math.log10(followerCount + 1) * 4 + (u.isVerified ? 6 : 0);
      return { value, score };
    })
  );
  const usersWithFollowers = scoredUsers.sort((a, b) => b.score - a.score).map((s) => s.value);

  // --- Posts (video/photo): relevance on caption/hashtags + real engagement + freshness ---
  function scorePost(v: (typeof rawVideos)[number]) {
    const captionRel = textRelevanceScore(v.caption, q);
    const hashtagRel = v.hashtags.reduce((max, h) => Math.max(max, textRelevanceScore(h.hashtag.tag, cleanTag)), 0);
    const relevance = Math.max(captionRel, hashtagRel);
    const ageHours = (Date.now() - v.createdAt.getTime()) / 3_600_000;
    const freshness = Math.max(0, 30 - ageHours) * 4;
    const engagement =
      (v.analytics?.views ?? 0) * 0.001 + (v.analytics?.likes ?? 0) * 0.5 + (v.analytics?.comments ?? 0) + (v.analytics?.shares ?? 0) * 1.2;
    return relevance * 20 + engagement + freshness;
  }
  const videoDtos = rawVideos
    .map((v) => ({ dto: serializeVideo(v, followingIds), score: scorePost(v) }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.dto);
  const photoDtos = rawPhotos
    .map((v) => ({ dto: serializeVideo(v, followingIds), score: scorePost(v) }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.dto);

  // --- Hashtags: relevance on the tag itself + real view volume ---
  const hashtagResults = hashtags
    .map((h) => ({
      value: { tag: h.tag, viewCount: h.viewCount, videoCount: h._count.videos },
      score: textRelevanceScore(h.tag, cleanTag) * 10 + Math.log10(h.viewCount + 1) * 3,
    }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.value);

  // --- Sounds: relevance on title/artist + real usage volume ---
  const soundResults = sounds
    .map((s) => ({
      sound: { ...serializeSound(s), videoCount: s._count.videos },
      score: Math.max(textRelevanceScore(s.title, q), textRelevanceScore(s.artist, q)) * 10 + Math.log10(s._count.videos + 1) * 3,
    }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.sound);

  // --- Live: relevance on title/category/host + real viewer count ---
  const liveResults = live
    .map((l) => ({
      value: {
        id: l.id,
        title: l.title,
        category: l.category,
        viewerCount: l.viewerCount,
        user: { username: l.user.username, displayName: l.user.displayName, avatarUrl: l.user.avatarUrl, isVerified: l.user.isVerified },
      },
      score:
        textRelevanceScore(l.title, q) * 1.5 + textRelevanceScore(l.category, q) + textRelevanceScore(l.user.username, q) + Math.log10(l.viewerCount + 1) * 3,
    }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.value);

  const cap = <T,>(arr: T[], n: number) => arr.slice(0, n);

  return jsonOk({
    users: cap(usersWithFollowers, isTop ? 4 : 30),
    videos: cap(videoDtos, isTop ? 6 : 30),
    photos: cap(photoDtos, isTop ? 6 : 30),
    hashtags: cap(hashtagResults, isTop ? 4 : 30),
    sounds: cap(soundResults, isTop ? 4 : 30),
    live: cap(liveResults, isTop ? 3 : 30),
  });
});
