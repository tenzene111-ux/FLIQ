import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);

  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const valid = await verifyPassword(parsed.data.currentPassword, full.passwordHash);
  if (!valid) return jsonError("Current password is incorrect", 401);

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return jsonOk({ ok: true });
});
