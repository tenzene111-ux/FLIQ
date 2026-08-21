import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { token } = await req.json().catch(() => ({ token: null }));
  if (!token) return jsonError("Missing token", 422);

  const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) return jsonError("Invalid or expired verification link", 400);

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, emailVerifyToken: null } });
  return jsonOk({ ok: true });
});
