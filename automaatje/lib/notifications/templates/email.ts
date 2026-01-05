/**
 * Email notification templates
 * Generates HTML emails for different notification types
 */
import type { Notification } from "@/lib/db/schema";

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Render notification as HTML email
 */
export function renderNotificationEmail(
  notification: Notification,
  recipientName: string
): EmailTemplate {
  const data = notification.data as any;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3123";

  // Generate text version
  const text = `
${data.title}

${data.message}

${data.action ? `${data.action.label}: ${appUrl}${data.action.url}` : ""}

---
Automaatje - Kilometerregistratie
  `.trim();

  // Generate HTML version
  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #f0f0f0;
    }
    .logo {
      width: 48px;
      height: 48px;
      background-color: #5b8596;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      margin-bottom: 12px;
    }
    .brand {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin: 0;
    }
    .notification-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      font-size: 32px;
    }
    .icon-blue { background-color: #dbeafe; }
    .icon-yellow { background-color: #fef3c7; }
    .icon-red { background-color: #fee2e2; }
    .icon-orange { background-color: #ffedd5; }
    .icon-green { background-color: #d1fae5; }
    .icon-default { background-color: #e0f2fe; }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #111;
    }
    .message {
      font-size: 16px;
      color: #666;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .priority-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .priority-urgent { background-color: #fee2e2; color: #991b1b; }
    .priority-high { background-color: #ffedd5; color: #9a3412; }
    .priority-normal { background-color: #e5e7eb; color: #374151; }
    .priority-low { background-color: #dbeafe; color: #1e40af; }
    .button {
      display: inline-block;
      background-color: #5b8596;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #4a6b7a;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    .footer a {
      color: #5b8596;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚗</div>
      <h2 class="brand">Automaatje</h2>
    </div>

    <div style="text-align: center;">
      <div class="notification-icon ${getIconColorClass(data.color)}">
        ${getIconEmoji(data.type)}
      </div>
    </div>

    ${data.priority && data.priority !== "normal" ? `
      <div style="text-align: center;">
        <span class="priority-badge priority-${data.priority}">
          ${getPriorityLabel(data.priority)}
        </span>
      </div>
    ` : ""}

    <h1>${data.title}</h1>

    <p class="message">${data.message}</p>

    ${data.action ? `
      <div style="text-align: center;">
        <a href="${appUrl}${data.action.url}" class="button">
          ${data.action.label}
        </a>
      </div>
    ` : ""}

    <div class="footer">
      <p>
        Je ontvangt deze e-mail omdat je notificaties hebt ingeschakeld voor je Automaatje account.
      </p>
      <p>
        <a href="${appUrl}/account/notificaties">Notificatie-instellingen wijzigen</a>
        •
        <a href="${appUrl}">Ga naar Automaatje</a>
      </p>
      <p style="margin-top: 16px; color: #ccc;">
        © ${new Date().getFullYear()} Automaatje
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    subject: data.title,
    html,
    text,
  };
}

/**
 * Get icon color class based on notification color
 */
function getIconColorClass(color?: string): string {
  switch (color) {
    case "blue":
      return "icon-blue";
    case "yellow":
      return "icon-yellow";
    case "red":
      return "icon-red";
    case "orange":
      return "icon-orange";
    case "green":
      return "icon-green";
    default:
      return "icon-default";
  }
}

/**
 * Get emoji icon for notification type
 */
function getIconEmoji(type: string): string {
  switch (type) {
    case "report_generated":
      return "📅";
    case "odometer_milestone":
      return "🏆";
    case "maintenance_reminder":
      return "🔧";
    case "shared_vehicle":
      return "👥";
    case "incomplete_trip":
      return "⚠️";
    case "system_announcement":
      return "ℹ️";
    default:
      return "📬";
  }
}

/**
 * Get priority label in Dutch
 */
function getPriorityLabel(priority: string): string {
  switch (priority) {
    case "urgent":
      return "Urgent";
    case "high":
      return "Hoog";
    case "low":
      return "Laag";
    default:
      return "Normaal";
  }
}
