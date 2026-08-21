import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({ details: z.string().min(5).max(1000) });

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Please describe the problem (at least 5 characters)", 422);

  await prisma.report.create({
    data: { reporterId: user.id, targetType: "app", reason: "other", details: parsed.data.details },
  });

  return jsonOk({ ok: true });
});
