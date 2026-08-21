import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);

  const user = await prisma.user.findFirst({ where: { resetToken: parsed.data.token } });
  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return jsonError("This reset link is invalid or has expired", 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpires: null },
  });

  return jsonOk({ ok: true });
});
