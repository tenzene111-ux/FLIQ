import { withAuth, jsonOk } from "@/lib/api";
import { setTyping, getTypingUsers } from "@/lib/typing";

export const POST = withAuth<{ id: string }>(async (_req, { user, params }) => {
  setTyping(params.id, user.id);
  return jsonOk({ ok: true });
});

export const GET = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const typingUserIds = getTypingUsers(params.id, user.id);
  return jsonOk({ typing: typingUserIds.length > 0 });
});
