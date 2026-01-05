
import { getPendingJobs, startJob, completeJob, failJob } from "./index";
import { jobHandlers } from "./handlers";

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

/**
 * Start the job processor with a polling interval
 */
export async function startJobProcessor(intervalMs: number = 60000) {
  logWithTimestamp(`[Job Processor] Starting with ${intervalMs}ms interval`);

  // Process jobs immediately on start
  await processJobs();

  // Then process periodically
  setInterval(async () => {
    await processJobs();
  }, intervalMs);
}
