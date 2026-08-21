import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { isValidUsername } from "@/lib/utils";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const username = (req.nextUrl.searchParams.get("username") || "").toLowerCase().trim();
  if (!username) return jsonError("Missing username", 422);
  if (!isValidUsername(username)) {
    return jsonOk({ available: false, reason: "3-30 characters, letters/numbers/underscore only" });
  }
  const userId = await getSessionUserId();
  const existing = await prisma.user.findUnique({ where: { username } });
  const available = !existing || existing.id === userId;
  return jsonOk({ available });
});
