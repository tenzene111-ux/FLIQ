import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { videoInclude, serializeVideo } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";

export const GET = withErrorHandling<{ username: string }>(async (req, { params }) => {
  const target = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);

  const viewer = await getCurrentUser();
  const isOwn = viewer?.id === target.id;
  const tab = req.nextUrl.searchParams.get("tab") || "videos";

  if ((tab === "liked" || tab === "saved") && !isOwn) {
    return jsonError("This list is private", 403);
  }

  const followingIds = await getFollowingIdSet(viewer?.id);
  const isFollower = followingIds.has(target.id);

  const privacyFilter = isOwn
    ? {}
    : isFollower
      ? { privacy: { in: ["everyone", "followers"] } }
      : { privacy: "everyone" };

  if (tab === "reposts") {
    const reposts = await prisma.repost.findMany({
      where: { userId: target.id, video: { status: "published", ...privacyFilter } },
      include: { video: { include: videoInclude(viewer?.id) } },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return jsonOk({ videos: reposts.map((r) => serializeVideo(r.video, followingIds)) });
  }

  if (tab === "liked") {
    const likes = await prisma.like.findMany({
      where: { userId: target.id, video: { status: "published" } },
      include: { video: { include: videoInclude(viewer?.id) } },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return jsonOk({ videos: likes.map((l) => serializeVideo(l.video, followingIds)) });
  }

  if (tab === "saved") {
    const saves = await prisma.save.findMany({
      where: { userId: target.id, video: { status: "published" } },
      include: { video: { include: videoInclude(viewer?.id) } },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return jsonOk({ videos: saves.map((s) => serializeVideo(s.video, followingIds)) });
  }

  const videos = await prisma.video.findMany({
    where: { userId: target.id, status: "published", ...privacyFilter },
    include: videoInclude(viewer?.id),
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return jsonOk({ videos: videos.map((v) => serializeVideo(v, followingIds)) });
});
