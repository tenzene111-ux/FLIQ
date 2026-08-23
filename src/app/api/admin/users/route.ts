import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAdmin, jsonOk } from "@/lib/api";
import { isOnline } from "@/lib/presence";

export const GET = withAdmin(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const status = req.nextUrl.searchParams.get("status") || "";

  const users = await prisma.user.findMany({
    where: {
      ...(q ? { OR: [{ username: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }] } : {}),
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      avatarUrl: true,
      isVerified: true,
      isAdmin: true,
      status: true,
      createdAt: true,
      _count: { select: { videos: true, followers: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return jsonOk({
    users: users.map((u) => ({ ...u, online: isOnline(u.id) })),
  });
});
