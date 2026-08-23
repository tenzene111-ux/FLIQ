import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { seedDatabase } from "../../../../../prisma/seed";

/**
 * One-time production bootstrap: populates demo data on a fresh database.
 * Gated behind JWT_SECRET (already private, already set in Vercel) rather
 * than a new env var. Refuses to wipe a database that already has users
 * unless `force=true` is passed explicitly.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.JWT_SECRET) {
    return jsonError("Unauthorized", 401);
  }

  const force = req.nextUrl.searchParams.get("force") === "true";
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && !force) {
    return jsonError(
      `Database already has ${existingUsers} user(s). Add &force=true to wipe and reseed.`,
      400
    );
  }

  await seedDatabase();
  return jsonOk({ ok: true, message: "Database seeded successfully." });
});
