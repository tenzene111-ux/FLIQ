import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAdmin, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({ status: z.enum(["reviewing", "resolved", "pending"]) });

export const POST = withAdmin<{ id: string }>(async (req, { params }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid status", 422);

  const report = await prisma.report.update({
    where: { id: params.id },
    data: { status: parsed.data.status, resolvedAt: parsed.data.status === "resolved" ? new Date() : null },
  }).catch(() => null);

  if (!report) return jsonError("Report not found", 404);
  return jsonOk({ report });
});
