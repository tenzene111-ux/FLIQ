import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAdmin, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({ action: z.enum(["suspend", "ban", "activate", "verify", "unverify"]) });

export const POST = withAdmin<{ id: string }>(async (req, { user, params }) => {
  if (params.id === user.id) return jsonError("You can't moderate your own account", 400);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid action", 422);

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return jsonError("User not found", 404);

  const data: { status?: string; isVerified?: boolean } = {};
  if (parsed.data.action === "suspend") data.status = "suspended";
  if (parsed.data.action === "ban") data.status = "banned";
  if (parsed.data.action === "activate") data.status = "active";
  if (parsed.data.action === "verify") data.isVerified = true;
  if (parsed.data.action === "unverify") data.isVerified = false;

  const updated = await prisma.user.update({ where: { id: params.id }, data });
  return jsonOk({ user: updated });
});
