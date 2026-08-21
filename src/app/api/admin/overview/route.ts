import { prisma } from "@/lib/db";
import { withAdmin, jsonOk } from "@/lib/api";
import { isOnline } from "@/lib/presence";

export const GET = withAdmin(async () => {
  const [userCount, videoCount, reportCount, pendingReports, allUsers, viewAgg] = await Promise.all([
    prisma.user.count(),
    prisma.video.count({ where: { status: { not: "removed" } } }),
    prisma.report.count(),
    prisma.report.count({ where: { status: "pending" } }),
    prisma.user.findMany({ select: { id: true } }),
    prisma.videoAnalytics.aggregate({ _sum: { views: true } }),
  ]);

  const activeUsers = allUsers.filter((u) => isOnline(u.id)).length;
  const totalViews = (viewAgg._sum.views ?? 0) + (await prisma.videoView.count());

  return jsonOk({
    stats: {
      users: userCount,
      activeUsers,
      videos: videoCount,
      views: totalViews,
      reports: reportCount,
      pendingReports,
      revenue: 0,
    },
  });
});
