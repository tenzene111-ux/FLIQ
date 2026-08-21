import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({
  targetType: z.enum(["video", "user", "comment", "message"]),
  targetId: z.string(),
  reason: z.enum(["spam", "harassment", "violence", "hate", "sexual", "dangerous", "copyright", "scam", "other"]),
  details: z.string().max(500).optional(),
});

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid report", 422);
  const { targetType, targetId, reason, details } = parsed.data;

  await prisma.report.create({
    data: {
      reporterId: user.id,
      targetType,
      reason,
      details,
      videoId: targetType === "video" ? targetId : undefined,
      reportedUserId: targetType === "user" ? targetId : undefined,
      commentId: targetType === "comment" ? targetId : undefined,
      messageId: targetType === "message" ? targetId : undefined,
    },
  });

  return jsonOk({ ok: true });
});
