"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "./auth";
import { eq } from "drizzle-orm";
import { sendTestEmail } from "@/lib/notifications/channels/email";
import { sendWebhookVerification } from "@/lib/notifications/channels/webhook";
import { sendAppriseTest } from "@/lib/notifications/channels/apprise";
import { enqueueJob } from "@/lib/jobs";
import crypto from "crypto";

type ActionResponse<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Update email notification settings
 */
export async function updateEmailSettings(settings: {
  enabled?: boolean;
  address?: string;
  digestSchedule?: string;
}): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const metadata = (currentUser.metadata as any) || {};
    const preferences = metadata.preferences || {};
    const notifications = preferences.notifications || {};
    const email = notifications.email || {};

    // Update email settings
    const updatedEmail = {
      ...email,
      address: settings.address || currentUser.email,
      digestSchedule: settings.digestSchedule,
    };

    // If address changed, mark as pending verification
    if (settings.address && settings.address !== email.address) {
      updatedEmail.verificationStatus = "pending";
      updatedEmail.verificationToken = crypto.randomBytes(32).toString("hex");
    }

    const updatedMetadata = {
      ...metadata,
      preferences: {
        ...preferences,
        notifications: {
          ...notifications,
          channels: {
            ...notifications.channels,
            email: settings.enabled ?? notifications.channels?.email ?? false,
          },
          email: updatedEmail,
        },
      },
    };

    await db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.id));

    return { success: true };
  } catch (error) {
    console.error("Error updating email settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fout bij opslaan",
    };
  }
}

/**
 * Send test email
 */
export async function sendTestEmailNotification(): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const metadata = (currentUser.metadata as any) || {};
    const emailAddress =
      metadata?.preferences?.notifications?.email?.address || currentUser.email;

    const result = await sendTestEmail(emailAddress);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fout bij verzenden",
    };
  }
}

/**
 * Update webhook notification settings
 */
export async function updateWebhookSettings(settings: {
  enabled?: boolean;
  url?: string;
  secret?: string;
  headers?: Record<string, string>;
}): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Validate webhook URL (must be HTTPS)
    // if (// settings.url && !settings.url.startsWith("https://")) {
    //  retur//n {
    //    succe//ss: false,
    //    error: //"Webhook URL moet HTTPS gebruiken",
    //  //};
    // }

    const metadata = (currentUser.metadata as any) || {};
    const preferences = metadata.preferences || {};
    const notifications = preferences.notifications || {};
    const webhook = notifications.webhook || {};

    // Update webhook settings
    const updatedWebhook = {
      ...webhook,
      url: settings.url,
      secret: settings.secret || webhook.secret,
      headers: settings.headers || webhook.headers || {},
    };

    // If URL changed, mark as pending verification
    if (settings.url && settings.url !== webhook.url) {
      updatedWebhook.verificationStatus = "pending";
    }

    const updatedMetadata = {
      ...metadata,
      preferences: {
        ...preferences,
        notifications: {
          ...notifications,
          channels: {
            ...notifications.channels,
            webhook: settings.enabled ?? notifications.channels?.webhook ?? false,
          },
          webhook: updatedWebhook,
        },
      },
    };

    await db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.id));

    return { success: true };
  } catch (error) {
    console.error("Error updating webhook settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fout bij opslaan",
    };
  }
}

/**
 * Verify webhook URL
 */
export async function verifyWebhook(): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const metadata = (currentUser.metadata as any) || {};
    const webhookConfig = metadata?.preferences?.notifications?.webhook;

    if (!webhookConfig?.url) {
      return { success: false, error: "Geen webhook URL geconfigureerd" };
    }

    const result = await sendWebhookVerification(
      webhookConfig.url,
      webhookConfig.secret
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Update verification status
    const updatedMetadata = {
      ...metadata,
      preferences: {
        ...metadata.preferences,
        notifications: {
          ...metadata.preferences.notifications,
          webhook: {
            ...webhookConfig,
            verificationStatus: "verified",
          },
        },
      },
    };

    await db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.id));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verificatie mislukt",
    };
  }
}

/**
 * Send test webhook notification (without verification requirement)
 */
export async function sendTestWebhook(
  url: string,
  secret?: string
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    if (!url) {
      return { success: false, error: "Geen webhook URL opgegeven" };
    }

    const result = await sendWebhookVerification(url, secret);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Test mislukt",
    };
  }
}

/**
 * Update Apprise notification settings
 */
export async function updateAppriseSettings(settings: {
  enabled?: boolean;
  urls?: string[];
}): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const metadata = (currentUser.metadata as any) || {};
    const preferences = metadata.preferences || {};
    const notifications = preferences.notifications || {};

    const updatedMetadata = {
      ...metadata,
      preferences: {
        ...preferences,
        notifications: {
          ...notifications,
          channels: {
            ...notifications.channels,
            apprise: settings.enabled ?? notifications.channels?.apprise ?? false,
          },
          apprise: {
            urls: settings.urls || [],
            verificationStatus: "verified", // Apprise doesn't need verification
          },
        },
      },
    };

    await db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.id));

    return { success: true };
  } catch (error) {
    console.error("Error updating Apprise settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fout bij opslaan",
    };
  }
}

/**
 * Test Apprise configuration
 */
export async function testAppriseNotification(): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const metadata = (currentUser.metadata as any) || {};
    const appriseConfig = metadata?.preferences?.notifications?.apprise;

    if (!appriseConfig?.urls || appriseConfig.urls.length === 0) {
      return { success: false, error: "Geen Apprise URLs geconfigureerd" };
    }

    const result = await sendAppriseTest(appriseConfig.urls);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Test mislukt",
    };
  }
}

/**
 * Update notification type preferences
 */
export async function updateNotificationTypeSettings(
  notificationType: string,
  settings: {
    enabled?: boolean;
    channels?: Array<"inbox" | "email" | "webhook" | "apprise">;
    [key: string]: any;
  }
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const metadata = (currentUser.metadata as any) || {};
    const preferences = metadata.preferences || {};
    const notifications = preferences.notifications || {};
    const types = notifications.types || {};

    const updatedMetadata = {
      ...metadata,
      preferences: {
        ...preferences,
        notifications: {
          ...notifications,
          types: {
            ...types,
            [notificationType]: {
              ...types[notificationType],
              ...settings,
            },
          },
        },
      },
    };

    await db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.id));

    return { success: true };
  } catch (error) {
    console.error("Error updating notification type settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fout bij opslaan",
    };
  }
}

/**
 * Send a test notification to the current user
 */
export async function sendTestNotification(): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Get user's enabled notification channels
    const metadata = (currentUser.metadata as any) || {};
    const notificationPrefs = metadata?.preferences?.notifications;
    const enabledChannels: string[] = ["inbox"]; // Inbox is always enabled

    // Add other enabled channels
    if (notificationPrefs?.channels?.email) {
      enabledChannels.push("email");
    }
    if (notificationPrefs?.channels?.webhook) {
      enabledChannels.push("webhook");
    }
    if (notificationPrefs?.channels?.apprise) {
      enabledChannels.push("apprise");
    }

    await enqueueJob("notification", {
      userId: currentUser.id,
      notificationData: {
        type: "custom",
        title: "Test notificatie",
        message:
          "Dit is een test notificatie om je instellingen te controleren. Als je dit ziet, werkt het systeem correct!",
        priority: "low",
        icon: "Info",
        channels: enabledChannels, // Explicitly specify channels
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fout bij verzenden",
    };
  }
}

/**
 * Get current notification settings
 */
export async function getNotificationSettings(): Promise<
  ActionResponse<{
    channels: {
      inbox: boolean;
      email: boolean;
      webhook: boolean;
      apprise: boolean;
    };
    email?: {
      address?: string;
      verificationStatus?: string;
      digestSchedule?: string;
    };
    webhook?: {
      url?: string;
      verificationStatus?: string;
    };
    apprise?: {
      urls?: string[];
    };
    types?: Record<string, any>;
  }>
> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const metadata = (currentUser.metadata as any) || {};
    const notifications = metadata?.preferences?.notifications || {};

    return {
      success: true,
      data: {
        channels: {
          inbox: true, // Always enabled
          email: notifications.channels?.email ?? false,
          webhook: notifications.channels?.webhook ?? false,
          apprise: notifications.channels?.apprise ?? false,
        },
        email: notifications.email,
        webhook: notifications.webhook,
        apprise: notifications.apprise,
        types: notifications.types || {},
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fout bij ophalen",
    };
  }
}
