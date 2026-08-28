import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { sendEmail, isDevMailer } from "@/lib/mailer";
import { renderEmailHtml } from "@/lib/email-template";

export const POST = withAuth(async (req, { user }) => {
  const token = nanoid(32);
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifyToken: token } });
  const link = `${req.nextUrl.origin}/settings/account?verify=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your Fliq email",
    html: renderEmailHtml({
      heading: "Verify your email",
      bodyText: "Confirm this is your email address to finish setting up your Fliq account.",
      ctaLabel: "Verify email",
      ctaUrl: link,
    }),
  });
  return jsonOk({ ok: true, devToken: isDevMailer() ? token : null });
});
