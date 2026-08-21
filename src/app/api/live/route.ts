import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";

export const GET = withErrorHandling(async () => {
  const streams = await prisma.liveStream.findMany({
    where: { status: "live" },
    include: { user: { select: PUBLIC_USER_SELECT } },
    orderBy: { startedAt: "desc" },
  });
  return jsonOk({ streams });
});

const schema = z.object({
  title: z.string().min(1).max(100),
  category: z.string().min(1).max(40),
  commentsOn: z.boolean().default(true),
});

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Give your live stream a title and category", 422);

  const existing = await prisma.liveStream.findFirst({ where: { userId: user.id, status: "live" } });
  if (existing) return jsonOk({ stream: existing }, 200);

  const stream = await prisma.liveStream.create({
    data: { userId: user.id, title: parsed.data.title, category: parsed.data.category, commentsOn: parsed.data.commentsOn, viewerCount: 0 },
  });

  return jsonOk({ stream }, 201);
});
