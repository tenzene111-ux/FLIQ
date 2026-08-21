import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";

const schema = z.object({ watchSeconds: z.number().min(0).max(3600).default(0), completed: z.boolean().default(false) });

export const POST = withErrorHandling<{ id: string }>(async (req, { params }) => {
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return jsonError("Video not found", 404);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const data = parsed.success ? parsed.data : { watchSeconds: 0, completed: false };

  const viewer = await getCurrentUser();
  await prisma.videoView.create({
    data: { videoId: video.id, userId: viewer?.id, watchSeconds: data.watchSeconds, completed: data.completed },
  });

  return jsonOk({ ok: true });
});
