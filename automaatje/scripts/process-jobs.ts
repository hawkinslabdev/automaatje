#!/usr/bin/env node

/**
 * Background Job Processor Script (Standalone)
 *
 * Processes pending background jobs without requiring Next.js server.
 * Docker-friendly, can be triggered by external cron services.
 *
 * Usage:
 *   node scripts/process-jobs.js           # Production
 *   tsx scripts/process-jobs.ts            # Development
 *
 * External Cron Services (Docker-friendly):
 *   - cron-job.org: POST to https://your-app.com/api/jobs/process
 *   - EasyCron: Similar setup
 *   - Cloud provider cron (AWS EventBridge, Google Cloud Scheduler)
 *
 * Local Cron (every 5 minutes):
 *   crontab: cd /path/to/app && node scripts/process-jobs.js
 */

import { db, schema } from "../lib/db/standalone.js";
import { eq, and, or, lte, isNull, sql } from "drizzle-orm";
import { jobHandlers } from "../lib/jobs/handlers.js";

/**
 * Get pending jobs that are ready to be processed
 */
async function getPendingJobs(limit = 10) {
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

  return jobs;
}

/**
 * Process all pending jobs
 */
async function processJobs() {
  console.log("[Job Processor] Checking for pending jobs...");

  const jobs = await getPendingJobs(10);

  if (jobs.length === 0) {
    console.log("[Job Processor] No pending jobs found");
    return;
  }

  console.log(`[Job Processor] Processing ${jobs.length} job(s)`);

  for (const job of jobs) {
    try {
      console.log(`[Job Processor] Starting job ${job.id} (type: ${job.type})`);

      // Mark job as processing
      await db
        .update(schema.backgroundJobs)
        .set({
          status: "processing",
          startedAt: new Date(),
          attempts: sql`${schema.backgroundJobs.attempts} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.backgroundJobs.id, job.id));

      // Get the handler for this job type
      const handler = jobHandlers[job.type];

      if (!handler) {
        console.error(`[Job Processor] No handler found for job type: ${job.type}`);
        await failJob(job.id, `No handler found for job type: ${job.type}`, job.attempts + 1, job.maxAttempts);
        continue;
      }

      // Execute the job handler
      const result = await handler(job.payload);

      if (result.success) {
        console.log(`[Job Processor] Job ${job.id} completed successfully`);
        await db
          .update(schema.backgroundJobs)
          .set({
            status: "completed",
            result: result.result,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.backgroundJobs.id, job.id));
      } else {
        console.error(`[Job Processor] Job ${job.id} failed:`, result.error);
        await failJob(job.id, result.error || "Unknown error", job.attempts + 1, job.maxAttempts);
      }
    } catch (error) {
      console.error(`[Job Processor] Error processing job ${job.id}:`, error);
      await failJob(
        job.id,
        error instanceof Error ? error.message : "Unknown error",
        job.attempts + 1,
        job.maxAttempts
      );
    }
  }

  console.log("[Job Processor] Finished processing jobs");
}

/**
 * Mark a job as failed
 */
async function failJob(jobId: string, error: string, attempts: number, maxAttempts: number) {
  const shouldRetry = attempts < maxAttempts;

  await db
    .update(schema.backgroundJobs)
    .set({
      status: shouldRetry ? "pending" : "failed",
      error,
      completedAt: shouldRetry ? undefined : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.backgroundJobs.id, jobId));
}

// Main execution
async function main() {
  console.log("[Job Processor] Starting job processing...");
  console.log(`[Job Processor] Time: ${new Date().toISOString()}`);

  try {
    await processJobs();
    console.log("[Job Processor] Job processing completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("[Job Processor] Fatal error:", error);
    process.exit(1);
  }
}

main();
