import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAdmin, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({ action: z.enum(["remove", "restore"]) });

export const POST = withAdmin<{ id: string }>(async (req, { params }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid action", 422);

  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return jsonError("Video not found", 404);

  const updated = await prisma.video.update({
    where: { id: params.id },
    data: { status: parsed.data.action === "remove" ? "removed" : "published" },
  });

  return jsonOk({ video: updated });
});
