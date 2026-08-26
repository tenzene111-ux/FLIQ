import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";

export const GET = withAuth<{ id: string }>(async (_req, { params }) => {
  const moderators = await prisma.liveModerator.findMany({
    where: { liveStreamId: params.id },
    include: { user: { select: PUBLIC_USER_SELECT } },
    orderBy: { assignedAt: "asc" },
  });
  return jsonOk({ moderators });
});

const schema = z.object({ username: z.string().min(1) });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.userId !== user.id) return jsonError("Only the host can assign moderators", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Missing username", 422);

  const target = await prisma.user.findUnique({ where: { username: parsed.data.username.toLowerCase() } });
  if (!target) return jsonError("User not found", 404);
  if (target.id === user.id) return jsonError("You're already the host", 400);

  const moderator = await prisma.liveModerator.upsert({
    where: { liveStreamId_userId: { liveStreamId: stream.id, userId: target.id } },
    create: { liveStreamId: stream.id, userId: target.id },
    update: {},
    include: { user: { select: PUBLIC_USER_SELECT } },
  });
  return jsonOk({ moderator }, 201);
});
