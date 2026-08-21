import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({
  mediaUrl: z.string().min(1),
  mediaType: z.enum(["image", "video"]).default("image"),
  text: z.string().max(200).optional(),
});

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid story", 422);

  const story = await prisma.story.create({
    data: {
      userId: user.id,
      mediaUrl: parsed.data.mediaUrl,
      mediaType: parsed.data.mediaType,
      text: parsed.data.text,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });

  return jsonOk({ story }, 201);
});
