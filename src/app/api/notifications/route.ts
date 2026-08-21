import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";

const TAB_TYPES: Record<string, string[] | undefined> = {
  all: undefined,
  likes: ["like"],
  comments: ["comment"],
  followers: ["follow"],
  mentions: ["mention"],
};

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const tab = req.nextUrl.searchParams.get("tab") || "all";
  const types = TAB_TYPES[tab];

  const notifications = await prisma.notification.findMany({
    where: { recipientId: user.id, ...(types ? { type: { in: types } } : {}) },
    include: {
      actor: { select: PUBLIC_USER_SELECT },
      video: { select: { id: true, thumbnailUrl: true, caption: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return jsonOk({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      commentText: n.commentText,
      actor: n.actor,
      video: n.video,
    })),
  });
});
