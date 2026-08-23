import { NextRequest } from "next/server";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { clearDatabase } from "../../../../../prisma/seed";

/**
 * One-time production reset: deletes every user/video/etc. and leaves the
 * database empty (no reseed). Gated behind JWT_SECRET, plus an explicit
 * `confirm=true` since this is irreversible.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.JWT_SECRET) {
    return jsonError("Unauthorized", 401);
  }

  if (req.nextUrl.searchParams.get("confirm") !== "true") {
    return jsonError("Add &confirm=true to permanently delete all data.", 400);
  }

  await clearDatabase();
  return jsonOk({ ok: true, message: "Database wiped. It's now empty — ready for real signups." });
});
