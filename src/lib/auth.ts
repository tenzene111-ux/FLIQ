import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const SESSION_COOKIE = "fliq_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSessionToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: SESSION_MAX_AGE });
}

export async function createSession(userId: string) {
  const token = signSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

// Public-safe user shape returned by the API / used across the app.
export const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  website: true,
  location: true,
  genderVisible: true,
  gender: true,
  isVerified: true,
  isCreator: true,
  isAdmin: true,
  isPrivate: true,
  status: true,
  createdAt: true,
} as const;

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...PUBLIC_USER_SELECT, email: true, emailVerified: true, interests: true },
  });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Not authenticated");
  }
  return user;
}

export class AuthError extends Error {}
