/**
 * Webhook notification delivery
 * Sends notifications to user-configured webhook URLs with HMAC signatures
 */
import crypto from "crypto";
import type { Notification, User } from "@/lib/db/schema";

interface DeliveryResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

interface WebhookPayload {
  event: string;
  timestamp: number;
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    priority?: string;
    action?: {
      label: string;
      url: string;
    };
    createdAt: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Send webhook notification
 */
export async function sendWebhookNotification(
  notification: Notification,
  user: User
): Promise<DeliveryResult> {
  try {
    // Get webhook configuration from user preferences
    const metadata = user.metadata as any;
    const webhookConfig = metadata?.preferences?.notifications?.webhook;

    if (!webhookConfig?.url) {
      return {
        success: false,
        error: "Webhook URL not configured",
      };
    }

    // Check verification status
    if (webhookConfig.verificationStatus !== "verified") {
      return {
        success: false,
        error: "Webhook not verified",
      };
    }

    // Get user profile data
    const profile = user.profile as any;
    const userName = profile?.name || "Unknown";

    // Build webhook payload
    const data = notification.data as any;
    const payload: WebhookPayload = {
      event: "notification.created",
      timestamp: Math.floor(Date.now() / 1000),
      notification: {
        id: notification.id,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority,
        action: data.action,
        createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
      },
      user: {
        id: user.id,
        email: user.email,
        name: userName,
      },
    };

    const payloadString = JSON.stringify(payload);

    // Generate HMAC signature if secret is configured
    const signature = webhookConfig.secret
      ? crypto
          .createHmac("sha256", webhookConfig.secret)
          .update(payloadString)
          .digest("hex")
      : undefined;

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Automaatje-Webhook/1.0",
      ...webhookConfig.headers,
    };

    if (signature) {
      headers["X-Automaatje-Signature"] = `sha256=${signature}`;
    }

    // Send webhook request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(webhookConfig.url, {
        method: "POST",
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          return {
            success: false,
            error: "Webhook request timed out after 10 seconds",
          };
        }
        return {
          success: false,
          error: fetchError.message,
        };
      }

      return {
        success: false,
        error: "Unknown fetch error",
      };
    }
  } catch (error) {
    console.error("Webhook notification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send webhook verification request
 * Used when user first configures a webhook URL
 */
export async function sendWebhookVerification(
  webhookUrl: string,
  secret?: string
): Promise<DeliveryResult> {
  try {
    const payload = {
      event: "webhook.verification",
      timestamp: Math.floor(Date.now() / 1000),
      challenge: crypto.randomBytes(16).toString("hex"),
    };

    const payloadString = JSON.stringify(payload);

    // Generate HMAC signature if secret provided
    const signature = secret
      ? crypto.createHmac("sha256", secret).update(payloadString).digest("hex")
      : undefined;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Automaatje-Webhook/1.0",
    };

    if (signature) {
      headers["X-Automaatje-Signature"] = `sha256=${signature}`;
    }

    // Send verification request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          return {
            success: false,
            error: "Verification request timed out after 5 seconds",
          };
        }
        return {
          success: false,
          error: fetchError.message,
        };
      }

      return {
        success: false,
        error: "Unknown fetch error",
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
 * Verify webhook HMAC signature
 * Used by webhook receivers to verify authenticity
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Extract signature value (remove "sha256=" prefix if present)
    const signatureValue = signature.startsWith("sha256=")
      ? signature.slice(7)
      : signature;

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signatureValue),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
