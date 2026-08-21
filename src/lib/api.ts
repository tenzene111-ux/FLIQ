import { NextRequest, NextResponse } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { touchPresence } from "@/lib/presence";

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function jsonOk<T extends object>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

type RouteCtx<P> = { params: Promise<P> };
type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

type AuthHandler<P> = (req: NextRequest, ctx: { user: CurrentUser; params: P }) => Promise<Response>;

/** Wraps a route handler, requiring an authenticated session. Works for both static and dynamic ([param]) routes. */
export function withAuth<P = Record<string, string>>(handler: AuthHandler<P>) {
  return async (req: NextRequest, routeCtx?: RouteCtx<P>) => {
    try {
      const user = await getCurrentUser();
      if (!user) return jsonError("Not authenticated", 401);
      if (user.status !== "active") return jsonError("Account is not active", 403);
      touchPresence(user.id);
      const params = routeCtx ? await routeCtx.params : ({} as P);
      return await handler(req, { user, params });
    } catch (err) {
      if (err instanceof AuthError) return jsonError(err.message, 401);
      console.error(err);
      return jsonError("Something went wrong", 500);
    }
  };
}

type OpenHandler<P> = (req: NextRequest, ctx: { params: P }) => Promise<Response>;

export function withErrorHandling<P = Record<string, string>>(handler: OpenHandler<P>) {
  return async (req: NextRequest, routeCtx?: RouteCtx<P>) => {
    try {
      const params = routeCtx ? await routeCtx.params : ({} as P);
      return await handler(req, { params });
    } catch (err) {
      if (err instanceof AuthError) return jsonError(err.message, 401);
      console.error(err);
      return jsonError("Something went wrong", 500);
    }
  };
}

/** Wraps a route handler, requiring an authenticated admin session. */
export function withAdmin<P = Record<string, string>>(handler: AuthHandler<P>) {
  return withAuth<P>(async (req, ctx) => {
    if (!ctx.user.isAdmin) return jsonError("Admin access required", 403);
    return handler(req, ctx);
  });
}

export function checkRateLimit(req: NextRequest, bucket: string, limit: number, windowMs: number) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const { ok } = rateLimit(`${bucket}:${ip}`, limit, windowMs);
  return ok;
}
