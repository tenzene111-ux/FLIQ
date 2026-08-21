import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { isValidUsername } from "@/lib/utils";
import { PUBLIC_USER_SELECT, clearSession } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(3).max(30).optional(),
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(160).optional(),
  website: z.string().max(200).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  genderVisible: z.boolean().optional(),
  gender: z.string().max(30).optional().nullable(),
  interests: z.array(z.string()).optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  const data = parsed.data;

  if (data.username && data.username.toLowerCase() !== user.username) {
    const lower = data.username.toLowerCase();
    if (!isValidUsername(lower)) return jsonError("Username must be 3-30 characters (letters, numbers, underscore)", 422);
    const existing = await prisma.user.findUnique({ where: { username: lower } });
    if (existing) return jsonError("This username is already taken", 409);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(data.username ? { username: data.username.toLowerCase() } : {}),
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.website !== undefined ? { website: data.website } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      ...(data.genderVisible !== undefined ? { genderVisible: data.genderVisible } : {}),
      ...(data.gender !== undefined ? { gender: data.gender } : {}),
      ...(data.interests !== undefined ? { interests: JSON.stringify(data.interests) } : {}),
    },
    select: { ...PUBLIC_USER_SELECT, email: true, emailVerified: true, interests: true },
  });

  return jsonOk({ user: updated });
});

export const DELETE = withAuth(async (_req, { user }) => {
  await prisma.user.delete({ where: { id: user.id } });
  await clearSession();
  return jsonOk({ ok: true });
});
