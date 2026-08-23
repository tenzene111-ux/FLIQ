import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createSession } from "@/lib/auth";
import { findOrCreateOAuthUser, getAppleClientSecret } from "@/lib/oauth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const code = form.get("code")?.toString();
  const state = form.get("state")?.toString();
  const store = await cookies();
  const expectedState = store.get("oauth_state")?.value;
  store.delete("oauth_state");

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=apple_failed", req.url));
  }

  try {
    const redirectUri = new URL("/api/auth/apple/callback", req.url).toString();
    const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID!,
        client_secret: getAppleClientSecret(),
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error(`Apple token exchange failed: ${await tokenRes.text()}`);
    const tokens = await tokenRes.json();

    const idTokenPayload = jwt.decode(tokens.id_token) as { sub: string; email?: string } | null;
    if (!idTokenPayload?.email) throw new Error("Apple did not return an email");

    // Apple only ever sends the user's name once, in this initial POST body.
    let name: string | undefined;
    const userJson = form.get("user")?.toString();
    if (userJson) {
      try {
        const parsed = JSON.parse(userJson);
        name = [parsed?.name?.firstName, parsed?.name?.lastName].filter(Boolean).join(" ") || undefined;
      } catch {
        // ignore malformed payload, fall back to a generated username
      }
    }

    const { user, isNew } = await findOrCreateOAuthUser({
      provider: "apple",
      providerId: idTokenPayload.sub,
      email: idTokenPayload.email,
      name,
    });

    await createSession(user.id);
    return NextResponse.redirect(new URL(isNew ? "/onboarding/interests" : "/home", req.url));
  } catch (err) {
    console.error("Apple OAuth callback failed:", err);
    return NextResponse.redirect(new URL("/login?error=apple_failed", req.url));
  }
}
