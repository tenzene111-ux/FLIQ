import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { getOrCreateDirectConversation } from "@/lib/messaging";

export const POST = withAuth<{ username: string }>(async (_req, { user, params }) => {
  const gate = await getOrCreateDirectConversation(user.id, params.username);
  if (!gate.ok) return jsonError(gate.reason, gate.reason === "User not found" ? 404 : 403);
  return jsonOk({ conversationId: gate.conversationId });
});
