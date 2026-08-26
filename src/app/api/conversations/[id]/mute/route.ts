import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({ muted: z.boolean() });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request", 422);

  const updated = await prisma.conversationParticipant
    .update({ where: { conversationId_userId: { conversationId: params.id, userId: user.id } }, data: { muted: parsed.data.muted } })
    .catch(() => null);
  if (!updated) return jsonError("Conversation not found", 404);

  return jsonOk({ muted: updated.muted });
});
