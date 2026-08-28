/** A minimal, inline-styled HTML email shell — email clients ignore external
 * CSS/JS, so everything here is inline. Kept deliberately plain (no images,
 * no web fonts) so it renders consistently everywhere. */
export function renderEmailHtml(opts: { heading: string; bodyText: string; ctaLabel: string; ctaUrl: string; footerNote?: string }) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#d946ef);padding:28px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;">Fliq</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:18px;color:#111114;">${opts.heading}</h1>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b;">${opts.bodyText}</p>
                <a href="${opts.ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#d946ef);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">${opts.ctaLabel}</a>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#9a9aa5;word-break:break-all;">
                  Or paste this link into your browser: ${opts.ctaUrl}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;font-size:12px;color:#9a9aa5;">${opts.footerNote ?? "If you didn't request this, you can safely ignore this email."}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
