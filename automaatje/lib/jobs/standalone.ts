/**
 * Standalone job functions for use in scripts
 * Uses standalone DB connection (no "use server" restrictions)
 */
import { nanoid } from "nanoid";
import { db, schema } from "../db/standalone";
import { eq, and, or, lte, isNull, sql } from "drizzle-orm";
import { jobHandlers } from "./handlers";

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
      payload: payload as any,
      scheduledFor: options?.scheduledFor,
      maxAttempts: options?.maxAttempts ?? 3,
    });

    return { success: true, data: { id: jobId } };
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
        result: result as any,
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

// Serilog-like timestamped logger
function logWithTimestamp(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Process all pending jobs
 * This function should be called periodically (e.g., every minute)
 */
export async function processJobs() {
  logWithTimestamp("[Job Processor] Checking for pending jobs...");

  const { success, jobs } = await getPendingJobs(10);

  if (!success || !jobs || jobs.length === 0) {
    logWithTimestamp("[Job Processor] No pending jobs found");
    return;
  }

  logWithTimestamp(`[Job Processor] Processing ${jobs.length} job(s)`);

  // Process jobs sequentially to avoid overwhelming the system
  for (const job of jobs) {
    try {
      logWithTimestamp(`[Job Processor] Starting job ${job.id} (type: ${job.type})`);

      // Mark job as processing
      await startJob(job.id);

      // Get the handler for this job type
      const handler = jobHandlers[job.type];

      if (!handler) {
        console.error(`[${new Date().toISOString()}] [Job Processor] No handler found for job type: ${job.type}`);
        await failJob(job.id, `No handler found for job type: ${job.type}`);
        continue;
      }

      // Execute the job handler
      const result = await handler(job.payload);

      if (result.success) {
        logWithTimestamp(`[Job Processor] Job ${job.id} completed successfully`);
        await completeJob(job.id, result.result);
      } else {
        console.error(`[${new Date().toISOString()}] [Job Processor] Job ${job.id} failed:`, result.error);
        await failJob(job.id, result.error || "Unknown error");
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [Job Processor] Error processing job ${job.id}:`, error);
      await failJob(
        job.id,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  logWithTimestamp("[Job Processor] Finished processing jobs");
}
