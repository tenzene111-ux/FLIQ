/**
 * Email service abstraction. In development/demo mode this just logs the
 * message (and the API routes that call it also return the token/link in
 * the JSON body so flows are testable without a real inbox — clearly
 * marked as dev-only below). Swap in a real provider (Resend, SES, Postmark…)
 * behind this same `sendEmail` signature for production, driven by env vars
 * (e.g. EMAIL_PROVIDER, EMAIL_API_KEY) rather than hardcoded credentials.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (process.env.EMAIL_PROVIDER === "console" || !process.env.EMAIL_PROVIDER) {
    console.log(`\n[mailer] → ${opts.to}\nSubject: ${opts.subject}\n${opts.html}\n`);
    return { ok: true, provider: "console" as const };
  }
  throw new Error(`Email provider "${process.env.EMAIL_PROVIDER}" is not configured.`);
}

export const isDevMailer = () => !process.env.EMAIL_PROVIDER || process.env.EMAIL_PROVIDER === "console";
