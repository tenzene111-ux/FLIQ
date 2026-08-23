import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=apple_not_configured", req.url));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const store = await cookies();
  // Apple redirects back via a cross-site POST (response_mode=form_post),
  // which browsers only attach SameSite=None cookies to — Lax would be
  // dropped. None requires Secure, so this only works over HTTPS.
  store.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = new URL("/api/auth/apple/callback", req.url).toString();
  const url = new URL("https://appleid.apple.com/auth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "name email");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
