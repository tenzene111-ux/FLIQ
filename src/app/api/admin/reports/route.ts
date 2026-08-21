import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAdmin, jsonOk } from "@/lib/api";

export const GET = withAdmin(async (req: NextRequest) => {
  const status = req.nextUrl.searchParams.get("status") || "pending";

  const reports = await prisma.report.findMany({
    where: { status },
    include: {
      reporter: { select: { username: true, displayName: true, avatarUrl: true } },
      reportedUser: { select: { username: true, displayName: true, avatarUrl: true } },
      video: { select: { id: true, caption: true, thumbnailUrl: true } },
      comment: { select: { id: true, text: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return jsonOk({ reports });
});
