"use server";

import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import type { Notification, NewNotification } from "@/lib/db/schema";
import { getCurrentUser } from "./auth";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

type ActionResponse<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Create a new notification
 * Internal function - typically called by job handlers or system events
 */
export async function createNotification(
  notification: Omit<NewNotification, "id" | "createdAt" | "updatedAt">
): Promise<ActionResponse<Notification>> {
  try {
    const id = randomUUID();
    const now = new Date();

    const newNotification: NewNotification = {
      id,
      userId: notification.userId,
      data: notification.data,
      isRead: notification.isRead ?? false,
      isArchived: notification.isArchived ?? false,
      isPinned: notification.isPinned ?? false,
      readAt: notification.readAt,
      archivedAt: notification.archivedAt,
      expiresAt: notification.expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    const [created] = await db
      .insert(notifications)
      .values(newNotification)
      .returning();

    return {
      success: true,
      data: created,
    };
  } catch (error) {
    console.error("Error creating notification:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Fout bij aanmaken notificatie",
    };
  }
}

/**
 * Get notifications for the current user
 * @param filter - "unread" | "archived" | "all"
 * @param limit - Maximum number of notifications to return
 */
export async function getNotifications(
  filter: "unread" | "archived" | "all" = "unread",
  limit = 50
): Promise<ActionResponse<Notification[]>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Niet geautoriseerd",
      };
    }

    let conditions = [eq(notifications.userId, currentUser.id)];

    if (filter === "unread") {
      conditions.push(eq(notifications.isRead, false));
      conditions.push(eq(notifications.isArchived, false));
    } else if (filter === "archived") {
      conditions.push(eq(notifications.isArchived, true));
    }

    const results = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(
        desc(notifications.isPinned),
        desc(notifications.createdAt)
      )
      .limit(limit);

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Fout bij ophalen notificaties",
    };
  }
}

/**
 * Get a single notification by ID
 */
export async function getNotificationById(
  notificationId: string
): Promise<ActionResponse<Notification>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Niet geautoriseerd",
      };
    }

    const [notification] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, currentUser.id)
        )
      )
      .limit(1);

    if (!notification) {
      return {
        success: false,
        error: "Notificatie niet gevonden",
      };
    }

    return {
      success: true,
      data: notification,
    };
  } catch (error) {
    console.error("Error fetching notification:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Fout bij ophalen notificatie",
    };
  }
}

/**
 * Get unread notification count for current user
 */
export async function getUnreadCount(): Promise<ActionResponse<number>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Niet geautoriseerd",
      };
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, currentUser.id),
          eq(notifications.isRead, false),
          eq(notifications.isArchived, false)
        )
      );

    return {
      success: true,
      data: result.count,
    };
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Fout bij ophalen aantal ongelezen notificaties",
    };
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Niet geautoriseerd",
      };
    }

    const [updated] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, currentUser.id)
        )
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Notificatie niet gevonden",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Fout bij markeren als gelezen",
    };
  }
}

/**
 * Mark a notification as unread
 */
export async function markAsUnread(
  notificationId: string
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Niet geautoriseerd",
      };
    }

    const [updated] = await db
      .update(notifications)
      .set({
        isRead: false,
        readAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, currentUser.id)
        )
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Notificatie niet gevonden",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as unread:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Fout bij markeren als ongelezen",
    };
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllAsRead(): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Niet geautoriseerd",
      };
    }

    const now = new Date();

    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(notifications.userId, currentUser.id),
          eq(notifications.isRead, false)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Error marking all as read:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Fout bij markeren alles als gelezen",
    };
  }
}

/**
 * Archive a notification
 */
export async function archiveNotification(
  notificationId: string
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Niet geautoriseerd",
      };
    }

    const [updated] = await db
      .update(notifications)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, currentUser.id)
        )
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Notificatie niet gevonden",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error archiving notification:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Fout bij archiveren",
    };
  }
}

/**
 * Unarchive a notification
 */
export async function unarchiveNotification(
  notificationId: string
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Niet geautoriseerd",
      };
    }

    const [updated] = await db
      .update(notifications)
      .set({
        isArchived: false,
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, currentUser.id)
        )
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Notificatie niet gevonden",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error unarchiving notification:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Fout bij terugzetten uit archief",
    };
  }
}

/**
 * Toggle pin status of a notification
 */
export async function togglePin(
  notificationId: string
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Niet geautoriseerd",
      };
    }

    // First get current state
    const [current] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, currentUser.id)
        )
      )
      .limit(1);

    if (!current) {
      return {
        success: false,
        error: "Notificatie niet gevonden",
      };
    }

    // Toggle the pin status
    await db
      .update(notifications)
      .set({
        isPinned: !current.isPinned,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));

    return { success: true };
  } catch (error) {
    console.error("Error toggling pin:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Fout bij vastpinnen",
    };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string
): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Niet geautoriseerd",
      };
    }

    const [deleted] = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, currentUser.id)
        )
      )
      .returning();

    if (!deleted) {
      return {
        success: false,
        error: "Notificatie niet gevonden",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Fout bij verwijderen",
    };
  }
}

/**
 * Delete all archived notifications for current user
 */
export async function deleteAllArchived(): Promise<ActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Niet geautoriseerd",
      };
    }

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, currentUser.id),
          eq(notifications.isArchived, true)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Error deleting archived notifications:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Fout bij verwijderen gearchiveerde notificaties",
    };
  }
}

/**
 * Update notification delivery status
 * Internal function - called by job handlers after attempting delivery
 */
export async function updateNotificationDeliveryStatus(
  notificationId: string,
  deliveryResults: Record<string, { success: boolean; error?: string }>
): Promise<ActionResponse> {
  try {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (!notification) {
      return {
        success: false,
        error: "Notificatie niet gevonden",
      };
    }

    // Extract successful channels and errors
    const deliveredVia = Object.entries(deliveryResults)
      .filter(([_, result]) => result.success)
      .map(([channel]) => channel as "inbox" | "email" | "webhook" | "apprise");

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

    // Update notification data with delivery info
    const updatedData = {
      ...notification.data,
      deliveredVia,
      ...(Object.keys(deliveryErrors).length > 0 && { deliveryErrors }),
    };

    await db
      .update(notifications)
      .set({
        data: updatedData,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));

    return { success: true };
  } catch (error) {
    console.error("Error updating delivery status:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Fout bij bijwerken bezorgstatus",
    };
  }
}

/**
 * Cleanup expired notifications
 * Internal function - called by scheduled cleanup job
 */
export async function cleanupExpiredNotifications(): Promise<
  ActionResponse<number>
> {
  try {
    const now = new Date();

    const deleted = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.isArchived, true),
          sql`${notifications.expiresAt} IS NOT NULL`,
          sql`${notifications.expiresAt} < ${now.getTime() / 1000}`
        )
      )
      .returning();

    return {
      success: true,
      data: deleted.length,
    };
  } catch (error) {
    console.error("Error cleaning up notifications:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Fout bij opschonen notificaties",
    };
  }
}
