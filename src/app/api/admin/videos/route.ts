import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAdmin, jsonOk } from "@/lib/api";

export const GET = withAdmin(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const status = req.nextUrl.searchParams.get("status") || "";

  const videos = await prisma.video.findMany({
    where: {
      ...(q ? { OR: [{ caption: { contains: q, mode: "insensitive" } }, { user: { username: { contains: q, mode: "insensitive" } } }] } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      user: { select: { username: true, displayName: true, avatarUrl: true } },
      analytics: true,
      _count: { select: { likes: true, comments: true, reports: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return jsonOk({
    videos: videos.map((v) => ({
      id: v.id,
      caption: v.caption,
      thumbnailUrl: v.thumbnailUrl,
      status: v.status,
      privacy: v.privacy,
      createdAt: v.createdAt,
      user: v.user,
      views: v.analytics?.views ?? 0,
      likes: (v.analytics?.likes ?? 0) + v._count.likes,
      comments: (v.analytics?.comments ?? 0) + v._count.comments,
      reportCount: v._count.reports,
    })),
  });
});
