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

type Actor = { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean } | null;
type VideoBrief = { id: string; thumbnailUrl: string; caption: string } | null;

interface GroupedLike {
  id: string;
  type: "like";
  isRead: boolean;
  createdAt: string;
  commentText: null;
  actor: Actor;
  secondActor: Actor;
  othersCount: number;
  video: VideoBrief;
  actorIds: Set<string>;
}

interface PlainItem {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  commentText: string | null;
  actor: Actor;
  secondActor: null;
  othersCount: number;
  video: VideoBrief;
}

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
    take: 200,
  });

  // Likes pile up fast — one row per like would spam the tab forever, so
  // every like on the same video collapses into "Alex, Maya and N others
  // liked your video" instead (spec: don't create one notification per
  // interaction when many people do the same thing).
  const likeGroups = new Map<string, GroupedLike>();
  const items: (GroupedLike | PlainItem)[] = [];

  for (const n of notifications) {
    if (n.type === "like" && n.videoId) {
      const existing = likeGroups.get(n.videoId);
      if (existing) {
        if (n.actorId && !existing.actorIds.has(n.actorId)) {
          existing.actorIds.add(n.actorId);
          if (!existing.secondActor) existing.secondActor = n.actor;
        }
        if (!n.isRead) existing.isRead = false;
        continue;
      }
      likeGroups.set(n.videoId, {
        id: `grouped-like-${n.videoId}`,
        type: "like",
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        commentText: null,
        actor: n.actor,
        secondActor: null,
        othersCount: 0,
        video: n.video,
        actorIds: new Set(n.actorId ? [n.actorId] : []),
      });
      items.push(likeGroups.get(n.videoId)!);
    } else {
      items.push({
        id: n.id,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        commentText: n.commentText,
        actor: n.actor,
        secondActor: null,
        othersCount: 0,
        video: n.video,
      });
    }
  }

  return jsonOk({
    notifications: items.map((item) => {
      if ("actorIds" in item) {
        const { actorIds, ...rest } = item;
        // The 2 named actors (actor + secondActor) aren't counted in "others".
        return { ...rest, othersCount: Math.max(0, actorIds.size - (rest.secondActor ? 2 : 1)) };
      }
      return item;
    }),
  });
});
