import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";

/**
 * Clears the negative-feedback signal ("Not Interested") used to shape the
 * For You feed. Does not touch likes, follows, posts, or any other account
 * data — only the suppression signal resets, so personalization rebuilds
 * from the user's existing likes/follows/watch history going forward.
 */
export const POST = withAuth(async (_req, { user }) => {
  await prisma.notInterested.deleteMany({ where: { userId: user.id } });
  return jsonOk({ ok: true });
});
