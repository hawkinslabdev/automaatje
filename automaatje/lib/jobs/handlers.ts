/**
 * Job Handlers
 *
 * Uses standalone DB connection to work both in scripts and API routes
 */
import { db, schema } from "../db/standalone";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * Job handler type
 */
export type JobHandler = (payload: Record<string, unknown>) => Promise<{
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}>;

/**
 * RDW Lookup Job Handler
 * Fetches vehicle details from RDW Open Data API
 */
export const rdwLookupHandler: JobHandler = async (payload) => {
  try {
    const { vehicleId, licensePlate } = payload;

    if (!vehicleId || !licensePlate) {
      return {
        success: false,
        error: "Missing vehicleId or licensePlate in job payload",
      };
    }

    // Get vehicle from database
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(schema.vehicles.id, vehicleId as string),
    });

    if (!vehicle) {
      return {
        success: false,
        error: "Vehicle not found",
      };
    }

    const details = vehicle.details as any;

    // Call RDW Open Data API directly (not through Next.js API route)
    const normalizedPlate = String(licensePlate).toUpperCase().replace(/-/g, "");
    const rdwUrl = `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${normalizedPlate}`;

    const response = await fetch(rdwUrl);

    if (!response.ok) {
      throw new Error("RDW API request failed");
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      // No vehicle found - update status to FAILED
      await db
        .update(schema.vehicles)
        .set({
          details: {
            ...details,
            detailsStatus: "FAILED",
            fetchError: "Geen voertuiggegevens gevonden voor dit kenteken",
          },
          updatedAt: new Date(),
        })
        .where(eq(schema.vehicles.id, vehicleId as string));

      return {
        success: false,
        error: "Geen voertuiggegevens gevonden voor dit kenteken",
      };
    }

    const vehicleData = data[0];

    // Extract year from date_first_registration (format: YYYYMMDD)
    let year: number | undefined;
    if (vehicleData.datum_eerste_toelating) {
      const yearStr = vehicleData.datum_eerste_toelating.toString().substring(0, 4);
      year = parseInt(yearStr);
    }

    const result = {
      make: vehicleData.merk || undefined,
      model: vehicleData.handelsbenaming || undefined,
      year: year,
    };

    // Update vehicle with RDW data (even if some fields are missing)
    await db
      .update(schema.vehicles)
      .set({
        details: {
          ...details,
          make: result.make,
          model: result.model,
          year: result.year,
          detailsStatus: result.make ? "READY" : "FAILED",
          fetchError: result.make ? undefined : "Onvolledige gegevens van RDW",
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.vehicles.id, vehicleId as string));

    return {
      success: result.make ? true : false,
      result: result.make ? result : undefined,
      error: result.make ? undefined : "Geen merk gevonden in RDW gegevens",
    };
  } catch (error) {
    console.error("RDW lookup job error:", error);

    // Try to update vehicle status to FAILED
    try {
      const { vehicleId } = payload;
      if (vehicleId) {
        const vehicle = await db.query.vehicles.findFirst({
          where: eq(schema.vehicles.id, vehicleId as string),
        });

        if (vehicle) {
          const details = vehicle.details as any;
          await db
            .update(schema.vehicles)
            .set({
              details: {
                ...details,
                detailsStatus: "FAILED",
                fetchError: error instanceof Error ? error.message : "Unknown error",
              },
              updatedAt: new Date(),
            })
            .where(eq(schema.vehicles.id, vehicleId as string));
        }
      }
    } catch (updateError) {
      console.error("Failed to update vehicle status:", updateError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Notification Job Handler
 * Creates and delivers notifications to users via configured channels
 */
export const notificationHandler: JobHandler = async (payload) => {
  try {
    const { userId, notificationData } = payload;

    if (!userId || !notificationData) {
      return {
        success: false,
        error: "Missing userId or notificationData in job payload",
      };
    }

    // 1. Get user and their notification preferences
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId as string),
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const metadata = user.metadata as any;
    const notificationPrefs = metadata?.preferences?.notifications;
    const typePrefs = notificationPrefs?.types?.[(notificationData as any).type as string];

    // 2. Check if user has enabled this notification type
    if (typePrefs?.enabled === false) {
      return {
        success: true,
        result: {
          skipped: true,
          reason: "Notification type disabled by user",
        },
      };
    }

    // 3. Create notification in database (inbox)
    const notificationId = randomUUID();
    const now = new Date();

    const notification = {
      id: notificationId,
      userId: userId as string,
      data: notificationData as any,
      isRead: false,
      isArchived: false,
      isPinned: false,
      readAt: null,
      archivedAt: null,
      expiresAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schema.notifications).values(notification);

    // 4. Track delivery results
    const deliveryResults: Record<string, { success: boolean; error?: string }> = {
      inbox: { success: true },
    };

    // 5. Determine which channels to deliver to
    const channels = typePrefs?.channels || ["inbox"];

    // 6. Deliver to each enabled channel
    // Import delivery handlers dynamically to avoid issues in script context
    for (const channel of channels) {
      if (channel === "email") {
        try {
          const { sendEmailNotification } = await import("../notifications/channels/email");
          const result = await sendEmailNotification(notification as any, user as any);
          deliveryResults.email = result;
        } catch (error) {
          deliveryResults.email = {
            success: false,
            error: error instanceof Error ? error.message : "Email delivery failed",
          };
        }
      } else if (channel === "webhook") {
        try {
          const { sendWebhookNotification } = await import("../notifications/channels/webhook");
          const result = await sendWebhookNotification(notification as any, user as any);
          deliveryResults.webhook = result;
        } catch (error) {
          deliveryResults.webhook = {
            success: false,
            error: error instanceof Error ? error.message : "Webhook delivery failed",
          };
        }
      } else if (channel === "apprise") {
        try {
          const { sendAppriseNotification } = await import("../notifications/channels/apprise");
          const result = await sendAppriseNotification(notification as any, user as any);
          deliveryResults.apprise = result;
        } catch (error) {
          deliveryResults.apprise = {
            success: false,
            error: error instanceof Error ? error.message : "Apprise delivery failed",
          };
        }
      }
    }

    // 7. Update notification with delivery results
    const deliveredVia = Object.entries(deliveryResults)
      .filter(([_, result]) => result.success)
      .map(([channel]) => channel);

    const deliveryErrors = Object.entries(deliveryResults)
      .filter(([_, result]) => !result.success && result.error)
      .reduce(
        (acc, [channel, result]) => {
          if (result.error) {
            acc[channel] = result.error;
          }
          return acc;
        },
        {} as Record<string, string>
      );

    const updatedData = {
      ...(notificationData as any),
      deliveredVia,
      ...(Object.keys(deliveryErrors).length > 0 && { deliveryErrors }),
    };

    await db
      .update(schema.notifications)
      .set({
        data: updatedData,
        updatedAt: new Date(),
      })
      .where(eq(schema.notifications.id, notificationId));

    return {
      success: true,
      result: {
        notificationId,
        deliveryResults,
      },
    };
  } catch (error) {
    console.error("Notification job error:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Job handler registry
 * Maps job types to their handlers
 */
export const jobHandlers: Record<string, JobHandler> = {
  rdw_lookup: rdwLookupHandler,
  notification: notificationHandler,
  // Add more handlers here as needed:
  // report_generation: reportGenerationHandler,
};
