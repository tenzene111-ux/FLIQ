import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { jsonError, jsonOk, checkRateLimit, withErrorHandling } from "@/lib/api";
import { isValidUsername } from "@/lib/utils";
import { PUBLIC_USER_SELECT } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .refine((v) => isValidUsername(v), "Username can only contain letters, numbers and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1).max(50).optional(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  if (!checkRateLimit(req, "signup", 10, 60_000)) {
    return jsonError("Too many attempts. Try again in a minute.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }
  const { email, username, password, displayName } = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingEmail) return jsonError("An account with this email already exists", 409);

  const existingUsername = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (existingUsername) return jsonError("This username is already taken", 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash,
      displayName: displayName || username,
      emailVerified: false,
      settings: { create: {} },
      analytics: { create: {} },
    },
    select: { ...PUBLIC_USER_SELECT, email: true, emailVerified: true, interests: true, usernameChangedAt: true },
  });

  await createSession(user.id);

  return jsonOk({ user }, 201);
});
