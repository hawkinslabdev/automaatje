#!/usr/bin/env node
/**
 * Initialize scheduled jobs
 * Run this once after deployment or on application startup
 */

import { ensureDailyOdometerReminder } from "../lib/jobs/schedulers.ts";

async function main() {
  console.log("[Init Jobs] Initializing scheduled jobs...");

  try {
    // Ensure daily odometer reminder is scheduled
    const result = await ensureDailyOdometerReminder();

    if (result.success) {
      console.log("[Init Jobs] ✓ Daily odometer reminder job initialized");
    } else {
      console.error("[Init Jobs] ✗ Failed to initialize odometer reminder:", result.error);
    }

    console.log("[Init Jobs] Initialization complete");
    process.exit(0);
  } catch (error) {
    console.error("[Init Jobs] Fatal error:", error);
    process.exit(1);
  }
}

main();
