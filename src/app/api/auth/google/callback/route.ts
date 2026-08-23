import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession } from "@/lib/auth";
import { findOrCreateOAuthUser } from "@/lib/oauth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("oauth_state")?.value;
  store.delete("oauth_state");

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }

  try {
    const redirectUri = new URL("/api/auth/google/callback", req.url).toString();
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${await tokenRes.text()}`);
    const tokens = await tokenRes.json();

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userInfoRes.ok) throw new Error("Google userinfo request failed");
    const profile = await userInfoRes.json();
    if (!profile.email) throw new Error("Google did not return an email");

    const { user, isNew } = await findOrCreateOAuthUser({
      provider: "google",
      providerId: profile.sub,
      email: profile.email,
      name: profile.name,
    });

    await createSession(user.id);
    return NextResponse.redirect(new URL(isNew ? "/onboarding/interests" : "/home", req.url));
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }
}
