import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession, PUBLIC_USER_SELECT } from "@/lib/auth";
import { jsonError, jsonOk, checkRateLimit, withErrorHandling } from "@/lib/api";

const schema = z.object({
  identifier: z.string().min(1), // email or username
  password: z.string().min(1),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  if (!checkRateLimit(req, "login", 20, 60_000)) {
    return jsonError("Too many attempts. Try again in a minute.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Enter your email/username and password", 422);

  const { identifier, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
    },
  });

  if (!user) return jsonError("Incorrect email/username or password", 401);
  if (user.status === "banned") return jsonError("This account has been banned.", 403);
  if (user.status === "suspended") return jsonError("This account is suspended.", 403);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return jsonError("Incorrect email/username or password", 401);

  if (user.status === "deactivated") {
    await prisma.user.update({ where: { id: user.id }, data: { status: "active" } });
  }

  await createSession(user.id);

  const safeUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { ...PUBLIC_USER_SELECT, email: true, emailVerified: true, interests: true },
  });

  return jsonOk({ user: safeUser });
});
