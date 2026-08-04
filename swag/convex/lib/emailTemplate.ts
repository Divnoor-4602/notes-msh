/**
 * Renders the swag email.
 *
 * The same subject and body are used whether the message goes out through
 * Resend or gets handed to the Superhuman Mail MCP server, so what you review
 * in the outbox is exactly what the recipient receives.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type SwagEmailInput = {
  recipientName: string;
  linkUrl: string;
  senderName: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export function renderSwagEmail({
  recipientName,
  linkUrl,
  senderName,
}: SwagEmailInput): RenderedEmail {
  const firstName = recipientName.split(" ")[0];
  const safeName = escapeHtml(firstName);
  const safeLink = escapeHtml(linkUrl);
  const safeSender = escapeHtml(senderName);

  const subject = `${firstName}, your Convex swag is ready`;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      One link, one order, free swag on us.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:48px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111111;">
            <tr>
              <td style="padding-bottom:32px;">
                <div style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#767676;">
                  Friends of Convex
                </div>
              </td>
            </tr>
            <tr>
              <td style="font-size:26px;line-height:1.3;font-weight:600;padding-bottom:20px;">
                Thank you for being a friend of Convex
              </td>
            </tr>
            <tr>
              <td style="font-size:16px;line-height:1.65;color:#333333;padding-bottom:16px;">
                Hey ${safeName},
              </td>
            </tr>
            <tr>
              <td style="font-size:16px;line-height:1.65;color:#333333;padding-bottom:16px;">
                You have been around for the builds, the demos, and the late night
                threads. Here is a small thank you. The link below is yours alone.
                Pick your size, add your shipping address, and check out. There is
                nothing to pay.
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0 24px 0;">
                <a href="${safeLink}"
                   style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:15px 30px;border-radius:8px;">
                  Claim your swag
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:1.6;color:#767676;padding-bottom:8px;">
                If the button does not work, paste this into your browser:
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;line-height:1.6;padding-bottom:28px;word-break:break-all;">
                <a href="${safeLink}" style="color:#111111;">${safeLink}</a>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:1.6;color:#767676;padding-bottom:28px;border-top:1px solid #e6e6e6;padding-top:24px;">
                Heads up, the link works once, so do not share it. If it has already
                been used or something looks wrong, just reply to this email.
              </td>
            </tr>
            <tr>
              <td style="font-size:16px;line-height:1.65;color:#333333;">
                ${safeSender}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Friends of Convex

Hey ${firstName},

Thank you for being a friend of Convex. You have been around for the builds, the demos, and the late night threads. Here is a small thank you.

The link below is yours alone. Pick your size, add your shipping address, and check out. There is nothing to pay.

${linkUrl}

Heads up, the link works once, so do not share it. If it has already been used or something looks wrong, just reply to this email.

${senderName}`;

  return { subject, html, text };
}
