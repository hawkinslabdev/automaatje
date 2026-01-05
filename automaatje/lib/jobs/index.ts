"use server";

import { nanoid } from "nanoid";
import { eq, and, or, lte, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Enqueue a new background job
 */
export async function enqueueJob(
  type: string,
  payload: Record<string, unknown>,
  options?: {
    scheduledFor?: Date;
    maxAttempts?: number;
  }
) {
  try {
    const jobId = nanoid();

    await db.insert(schema.backgroundJobs).values({
      id: jobId,
      type,
      payload,
      scheduledFor: options?.scheduledFor,
      maxAttempts: options?.maxAttempts ?? 3,
    });

    return { success: true, jobId };
  } catch (error) {
    console.error("Failed to enqueue job:", error);
    return { success: false, error: "Failed to enqueue job" };
  }
}

/**
 * Get pending jobs that are ready to be processed
 */
export async function getPendingJobs(limit = 10) {
  try {
    const now = new Date();

    const jobs = await db.query.backgroundJobs.findMany({
      where: and(
        eq(schema.backgroundJobs.status, "pending"),
        or(
          isNull(schema.backgroundJobs.scheduledFor),
          lte(schema.backgroundJobs.scheduledFor, now)
        )
      ),
      limit,
      orderBy: (jobs, { asc }) => [asc(jobs.createdAt)],
    });

    return { success: true, jobs };
  } catch (error) {
    console.error("Failed to get pending jobs:", error);
    return { success: false, error: "Failed to get pending jobs", jobs: [] };
  }
}

/**
 * Mark a job as processing
 */
export async function startJob(jobId: string) {
  try {
    await db
      .update(schema.backgroundJobs)
      .set({
        status: "processing",
        startedAt: new Date(),
        attempts: sql`attempts + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.backgroundJobs.id, jobId));

    return { success: true };
  } catch (error) {
    console.error("Failed to start job:", error);
    return { success: false, error: "Failed to start job" };
  }
}

/**
 * Mark a job as completed
 */
export async function completeJob(jobId: string, result?: Record<string, unknown>) {
  try {
    await db
      .update(schema.backgroundJobs)
      .set({
        status: "completed",
        result,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.backgroundJobs.id, jobId));

    return { success: true };
  } catch (error) {
    console.error("Failed to complete job:", error);
    return { success: false, error: "Failed to complete job" };
  }
}

/**
 * Mark a job as failed
 */
export async function failJob(jobId: string, error: string) {
  try {
    // Get the job to check retry attempts
    const job = await db.query.backgroundJobs.findFirst({
      where: eq(schema.backgroundJobs.id, jobId),
    });

    if (!job) {
      return { success: false, error: "Job not found" };
    }

    const shouldRetry = job.attempts < job.maxAttempts;

    await db
      .update(schema.backgroundJobs)
      .set({
        status: shouldRetry ? "pending" : "failed",
        error,
        completedAt: shouldRetry ? undefined : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.backgroundJobs.id, jobId));

    return { success: true, willRetry: shouldRetry };
  } catch (err) {
    console.error("Failed to fail job:", err);
    return { success: false, error: "Failed to update job status" };
  }
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string) {
  try {
    const job = await db.query.backgroundJobs.findFirst({
      where: eq(schema.backgroundJobs.id, jobId),
    });

    return { success: true, job };
  } catch (error) {
    console.error("Failed to get job:", error);
    return { success: false, error: "Failed to get job" };
  }
}
