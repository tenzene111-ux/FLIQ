import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";

export const GET = withErrorHandling<{ id: string }>(async (_req, { params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id }, include: { user: { select: PUBLIC_USER_SELECT } } });
  if (!stream) return jsonError("Live stream not found", 404);
  const viewer = await getCurrentUser();
  return jsonOk({ stream: { ...stream, isHost: viewer?.id === stream.userId } });
});
