/**
 * Email service abstraction. In development/demo mode (no EMAIL_PROVIDER
 * set) this just logs the message, and the API routes that call it also
 * return the token/link directly in the JSON body so flows are testable
 * without a real inbox — see `isDevMailer()`, which gates that behavior off
 * the moment a real provider is configured.
 *
 * Set EMAIL_PROVIDER=resend (plus RESEND_API_KEY and EMAIL_FROM) to send
 * real email via Resend's API — https://resend.com, generous free tier,
 * no SDK needed since it's a single REST call.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const provider = process.env.EMAIL_PROVIDER;

  if (!provider || provider === "console") {
    console.log(`\n[mailer] → ${opts.to}\nSubject: ${opts.subject}\n${opts.html}\n`);
    return { ok: true, provider: "console" as const };
  }

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      throw new Error("RESEND_API_KEY and EMAIL_FROM must both be set to use EMAIL_PROVIDER=resend");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend API error (${res.status}): ${detail}`);
    }

    return { ok: true, provider: "resend" as const };
  }

  throw new Error(`Email provider "${provider}" is not configured.`);
}

export const isDevMailer = () => !process.env.EMAIL_PROVIDER || process.env.EMAIL_PROVIDER === "console";
