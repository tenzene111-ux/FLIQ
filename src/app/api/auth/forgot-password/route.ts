import { NextRequest } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, checkRateLimit, withErrorHandling } from "@/lib/api";
import { sendEmail, isDevMailer } from "@/lib/mailer";

const schema = z.object({ email: z.string().email() });

export const POST = withErrorHandling(async (req: NextRequest) => {
  if (!checkRateLimit(req, "forgot-password", 5, 60_000)) {
    return jsonError("Too many attempts. Try again in a minute.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Enter a valid email", 422);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });

  // Always respond the same way whether or not the account exists, so the
  // API doesn't leak which emails are registered.
  if (!user) return jsonOk({ ok: true, devToken: null });

  const resetToken = nanoid(32);
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const resetLink = `/reset-password?token=${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Fliq password",
    html: `Click to reset your password: ${resetLink}`,
  });

  // Dev-mode convenience: hand back the token/link directly since there's no
  // real inbox in this environment. Never do this with a real email provider.
  return jsonOk({ ok: true, devToken: isDevMailer() ? resetToken : null });
});
