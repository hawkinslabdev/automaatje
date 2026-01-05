/**
 * Email template for password reset with 6-digit verification code
 */
export function generatePasswordResetEmail(code: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Wachtwoord herstellen - Automaatje";

  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wachtwoord herstellen</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
    <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">Wachtwoord herstellen</h1>
    <p style="color: #555; margin: 0 0 16px 0;">
      Je hebt een wachtwoordherstel aangevraagd voor je Automaatje account.
    </p>
    <p style="color: #555; margin: 0 0 24px 0;">
      Gebruik de volgende 6-cijferige code om je wachtwoord te herstellen:
    </p>

    <div style="background-color: #ffffff; border: 2px solid #e0e0e0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; font-family: 'Courier New', monospace;">
        ${code}
      </div>
    </div>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>Belangrijk:</strong> Deze code is 15 minuten geldig en kan maximaal 3 keer worden gebruikt.
      </p>
    </div>

    <p style="color: #555; margin: 0 0 12px 0; font-size: 14px;">
      Als je geen wachtwoordherstel hebt aangevraagd, kun je deze e-mail negeren. Je wachtwoord blijft dan ongewijzigd.
    </p>

    <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 12px 16px; margin-top: 20px; border-radius: 4px;">
      <p style="margin: 0; color: #721c24; font-size: 13px;">
        <strong>Beveiligingswaarschuwing:</strong> Deel deze code nooit met anderen. Automaatje zal je nooit om deze code vragen.
      </p>
    </div>
  </div>

  <div style="text-align: center; color: #888; font-size: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
    <p style="margin: 0 0 8px 0;">Automaatje - Zakelijke kilometerregistratie</p>
    <p style="margin: 0;">Deze e-mail is automatisch verstuurd. Reageer niet op dit bericht.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Wachtwoord herstellen - Automaatje

Je hebt een wachtwoordherstel aangevraagd voor je Automaatje account.

Gebruik de volgende 6-cijferige code om je wachtwoord te herstellen:

${code}

BELANGRIJK: Deze code is 15 minuten geldig en kan maximaal 3 keer worden gebruikt.

Als je geen wachtwoordherstel hebt aangevraagd, kun je deze e-mail negeren. Je wachtwoord blijft dan ongewijzigd.

BEVEILIGINGSWAARSCHUWING: Deel deze code nooit met anderen. Automaatje zal je nooit om deze code vragen.

---
Automaatje - Zakelijke kilometerregistratie
Deze e-mail is automatisch verstuurd. Reageer niet op dit bericht.
  `.trim();

  return { subject, html, text };
}
