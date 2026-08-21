import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { sendEmail, isDevMailer } from "@/lib/mailer";

export const POST = withAuth(async (_req, { user }) => {
  const token = nanoid(32);
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifyToken: token } });
  const link = `/settings/account?verify=${token}`;
  await sendEmail({ to: user.email, subject: "Verify your Fliq email", html: `Verify: ${link}` });
  return jsonOk({ ok: true, devToken: isDevMailer() ? token : null });
});
