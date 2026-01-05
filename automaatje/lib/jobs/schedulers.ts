"use server";

import { enqueueJob } from "./index";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Schedule the daily odometer reminder job
 * This should be called once at application startup to ensure the recurring job exists
 */
export async function ensureDailyOdometerReminder() {
  try {
    // Check if there's already a pending or processing odometer_reminder job scheduled for today or future
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existingJob = await db.query.backgroundJobs.findFirst({
      where: (jobs, { and, eq, or, gte }) =>
        and(
          eq(jobs.type, "odometer_reminder"),
          or(
            eq(jobs.status, "pending"),
            eq(jobs.status, "processing")
          ),
          gte(jobs.scheduledFor, todayStart)
        ),
    });

    if (existingJob) {
      console.log("[Scheduler] Daily odometer reminder job already scheduled");
      return { success: true, message: "Job already scheduled" };
    }

    // Schedule for tomorrow at 8:00 AM
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const result = await enqueueJob(
      "odometer_reminder",
      {},
      {
        scheduledFor: tomorrow,
        maxAttempts: 1, // Don't retry on failure
      }
    );

    if (result.success) {
      console.log(`[Scheduler] Scheduled daily odometer reminder for ${tomorrow.toISOString()}`);
    }

    return result;
  } catch (error) {
    console.error("[Scheduler] Error ensuring daily odometer reminder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Reschedule the next day's odometer reminder
 * This should be called after the odometer_reminder job completes
 */
export async function scheduleNextOdometerReminder() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  return enqueueJob(
    "odometer_reminder",
    {},
    {
      scheduledFor: tomorrow,
      maxAttempts: 1,
    }
  );
}
