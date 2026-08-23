import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

type OAuthProvider = "google" | "apple";

type OAuthProfile = {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name?: string;
};

async function uniqueUsernameFrom(base: string) {
  const cleaned = base.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "user";
  let candidate = cleaned;
  let n = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    n += 1;
    candidate = `${cleaned}${n}`;
  }
  return candidate;
}

export async function findOrCreateOAuthUser(profile: OAuthProfile) {
  const existing = await prisma.user.findFirst({
    where: profile.provider === "google" ? { googleId: profile.providerId } : { appleId: profile.providerId },
  });
  if (existing) return { user: existing, isNew: false };

  // An account with this email already exists (e.g. signed up with a
  // password originally) — link this provider to it rather than duplicating.
  const byEmail = await prisma.user.findUnique({ where: { email: profile.email.toLowerCase() } });
  if (byEmail) {
    const updated = await prisma.user.update({
      where: { id: byEmail.id },
      data: profile.provider === "google" ? { googleId: profile.providerId } : { appleId: profile.providerId },
    });
    return { user: updated, isNew: false };
  }

  const username = await uniqueUsernameFrom(profile.email.split("@")[0]);
  const created = await prisma.user.create({
    data: {
      email: profile.email.toLowerCase(),
      username,
      displayName: profile.name || username,
      emailVerified: true,
      googleId: profile.provider === "google" ? profile.providerId : undefined,
      appleId: profile.provider === "apple" ? profile.providerId : undefined,
      settings: { create: {} },
      analytics: { create: {} },
    },
  });
  return { user: created, isNew: true };
}

// Apple requires a short-lived JWT (signed with your Sign in with Apple
// private key) as the OAuth "client secret" on every token exchange.
export function getAppleClientSecret() {
  const teamId = process.env.APPLE_TEAM_ID!;
  const clientId = process.env.APPLE_CLIENT_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");

  return jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "5m",
    issuer: teamId,
    audience: "https://appleid.apple.com",
    subject: clientId,
    keyid: keyId,
  });
}
