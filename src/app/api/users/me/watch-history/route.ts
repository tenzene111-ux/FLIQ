import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { videoInclude, serializeVideo } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";

export const GET = withAuth(async (_req, { user }) => {
  const views = await prisma.videoView.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    distinct: ["videoId"],
    take: 60,
    include: { video: { include: videoInclude(user.id) } },
  });

  const followingIds = await getFollowingIdSet(user.id);
  return jsonOk({ videos: views.filter((v) => v.video.status === "published").map((v) => serializeVideo(v.video, followingIds)) });
});
