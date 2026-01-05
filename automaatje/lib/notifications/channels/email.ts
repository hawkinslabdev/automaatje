/**
 * Email notification delivery via Resend
 */
import { Resend } from "resend";
import type { Notification, User } from "@/lib/db/schema";
import { renderNotificationEmail } from "../templates/email";

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface DeliveryResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Send email notification via Resend
 */
export async function sendEmailNotification(
  notification: Notification,
  user: User
): Promise<DeliveryResult> {
  // Check if Resend is configured
  if (!resend) {
    return {
      success: false,
      error: "Resend API key not configured",
    };
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    return {
      success: false,
      error: "RESEND_FROM_EMAIL not configured",
    };
  }

  try {
    // Get user's email preferences
    const metadata = user.metadata as any;
    const emailPrefs = metadata?.preferences?.notifications?.email;

    // Determine recipient email
    const recipientEmail = emailPrefs?.address || user.email;

    if (!recipientEmail) {
      return {
        success: false,
        error: "No recipient email address",
      };
    }

    // Check email verification status
    if (emailPrefs?.verificationStatus !== "verified" && emailPrefs?.address) {
      return {
        success: false,
        error: "Email address not verified",
      };
    }

    // Get user name
    const profile = user.profile as any;
    const userName = profile?.name || "daar";

    // Render email template
    const { subject, html, text } = renderNotificationEmail(notification, userName);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME || "Automaatje"} <${process.env.RESEND_FROM_EMAIL}>`,
      to: recipientEmail,
      subject,
      html,
      text,
      // Add tags for tracking
      tags: [
        { name: "notification_type", value: (notification.data as any).type },
        { name: "user_id", value: user.id },
      ],
    });

    if (error) {
      console.error("Resend email error:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("Email notification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a test email notification
 */
export async function sendTestEmail(recipientEmail: string): Promise<DeliveryResult> {
  if (!resend) {
    return {
      success: false,
      error: "Resend API key not configured",
    };
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    return {
      success: false,
      error: "RESEND_FROM_EMAIL not configured",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME || "Automaatje"} <${process.env.RESEND_FROM_EMAIL}>`,
      to: recipientEmail,
      subject: "Test notificatie van Automaatje",
      html: `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      color: #333;
      margin-bottom: 16px;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
    .success {
      color: #059669;
      font-weight: 600;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">✅</div>
    <h1>E-mail notificaties werken!</h1>
    <p>
      Dit is een test e-mail om te bevestigen dat je e-mail notificaties correct zijn geconfigureerd.
    </p>
    <p class="success">
      Je bent klaar om notificaties via e-mail te ontvangen.
    </p>
  </div>
</body>
</html>
      `,
      text: "E-mail notificaties werken! Dit is een test e-mail om te bevestigen dat je e-mail notificaties correct zijn geconfigureerd.",
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to send test email",
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
