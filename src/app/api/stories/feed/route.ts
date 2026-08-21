import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";
import { getFollowingIdSet } from "@/lib/social";

export const GET = withAuth(async (_req, { user }) => {
  const followingIds = await getFollowingIdSet(user.id);
  const authorIds = [...followingIds, user.id];

  const stories = await prisma.story.findMany({
    where: { userId: { in: authorIds }, expiresAt: { gt: new Date() } },
    include: { user: { select: PUBLIC_USER_SELECT }, views: { where: { userId: user.id }, select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });

  const byUser = new Map<string, { user: (typeof stories)[number]["user"]; stories: typeof stories; viewed: boolean }>();
  for (const s of stories) {
    const entry = byUser.get(s.userId) ?? { user: s.user, stories: [] as typeof stories, viewed: true };
    entry.stories.push(s);
    if (s.views.length === 0) entry.viewed = false;
    byUser.set(s.userId, entry);
  }

  const groups = [...byUser.values()]
    .map((g) => ({
      user: g.user,
      viewed: g.viewed,
      stories: g.stories.map((s) => ({ id: s.id, mediaUrl: s.mediaUrl, mediaType: s.mediaType, text: s.text, createdAt: s.createdAt.toISOString() })),
    }))
    .sort((a, b) => {
      if (a.user.id === user.id) return -1;
      if (b.user.id === user.id) return 1;
      return Number(a.viewed) - Number(b.viewed);
    });

  return jsonOk({ groups });
});
