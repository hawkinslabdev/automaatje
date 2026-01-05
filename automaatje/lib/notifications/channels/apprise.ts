/**
 * Apprise notification delivery
 * Sends notifications via Apprise (100+ services) using CLI
 *
 * SETUP: Install Apprise CLI
 * pip install apprise
 * or
 * apt-get install apprise
 */
import { exec } from "child_process";
import { promisify } from "util";
import type { Notification, User } from "@/lib/db/schema";

const execAsync = promisify(exec);

interface DeliveryResult {
  success: boolean;
  error?: string;
}

/**
 * Check if Apprise CLI is installed
 */
async function isAppriseInstalled(): Promise<boolean> {
  try {
    await execAsync("which apprise");
    return true;
  } catch {
    return false;
  }
}

/**
 * Send notification via Apprise CLI
 */
export async function sendAppriseNotification(
  notification: Notification,
  user: User
): Promise<DeliveryResult> {
  try {
    // Get Apprise configuration from user preferences
    const metadata = user.metadata as any;
    const appriseConfig = metadata?.preferences?.notifications?.apprise;

    if (!appriseConfig?.urls || appriseConfig.urls.length === 0) {
      return {
        success: false,
        error: "Apprise URLs not configured",
      };
    }

    // Check if Apprise CLI is installed
    const installed = await isAppriseInstalled();
    if (!installed) {
      return {
        success: false,
        error: "Apprise CLI not installed. Install with: pip install apprise",
      };
    }

    // Build notification content
    const data = notification.data as any;
    const title = data.title;
    const body = buildNotificationBody(notification);

    // Build apprise command
    const urls = appriseConfig.urls.join(" ");
    const priorityFlag = mapPriorityToApprise(data.priority);

    // Escape shell arguments
    const escapedTitle = escapeShellArg(title);
    const escapedBody = escapeShellArg(body);

    const command = `apprise ${urls} --title ${escapedTitle} --body ${escapedBody} ${priorityFlag}`;

    try {
      // Execute apprise command with timeout
      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000, // 10 second timeout
      });

      if (stderr && !stderr.includes("INFO")) {
        console.warn("Apprise stderr:", stderr);
      }

      return {
        success: true,
      };
    } catch (execError: any) {
      console.error("Apprise execution error:", execError);
      return {
        success: false,
        error: execError.message || "Apprise command failed",
      };
    }
  } catch (error) {
    console.error("Apprise notification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Build notification body with action link if present
 */
function buildNotificationBody(notification: Notification): string {
  const data = notification.data as any;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3123";

  let body = data.message;

  if (data.action) {
    body += `\n\n${data.action.label}: ${appUrl}${data.action.url}`;
  }

  return body;
}

/**
 * Map priority levels to Apprise priority flags
 */
function mapPriorityToApprise(priority?: string): string {
  switch (priority) {
    case "low":
      return "--priority=low";
    case "normal":
      return "--priority=normal";
    case "high":
      return "--priority=high";
    case "urgent":
      return "--priority=emergency";
    default:
      return "--priority=normal";
  }
}

/**
 * Escape shell argument to prevent command injection
 */
function escapeShellArg(arg: string): string {
  // Replace single quotes with '\'' and wrap in single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Test Apprise configuration
 */
export async function sendAppriseTest(urls: string[]): Promise<DeliveryResult> {
  try {
    const installed = await isAppriseInstalled();
    if (!installed) {
      return {
        success: false,
        error: "Apprise CLI not installed. Install with: pip install apprise",
      };
    }

    const urlsString = urls.join(" ");
    const title = escapeShellArg("Test notificatie");
    const body = escapeShellArg(
      "Dit is een test om te controleren of Apprise correct is geconfigureerd."
    );

    const command = `apprise ${urlsString} --title ${title} --body ${body} --priority=low`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000,
      });

      if (stderr && !stderr.includes("INFO")) {
        console.warn("Apprise test stderr:", stderr);
      }

      return {
        success: true,
      };
    } catch (execError: any) {
      return {
        success: false,
        error: execError.message || "Apprise test failed",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate Apprise URL format
 * Apprise URLs follow specific schemas for different services
 */
export function validateAppriseUrl(url: string): boolean {
  try {
    // Basic validation - must contain a protocol
    if (!url.includes("://")) {
      return false;
    }

    // Common Apprise URL schemas
    const validSchemas = [
      "discord://",
      "slack://",
      "telegram://",
      "mailto://",
      "twilio://",
      "pushbullet://",
      "pushover://",
      "gotify://",
      "ntfy://",
      "msteams://",
      "matrix://",
      "rocket://",
      "signal://",
      "discord://",
      "guilded://",
      "ifttt://",
      "json://",
      "xml://",
    ];

    return validSchemas.some((schema) => url.toLowerCase().startsWith(schema));
  } catch {
    return false;
  }
}
