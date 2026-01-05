import { NextResponse } from "next/server";
import { processJobs } from "@/lib/jobs/processor";

/**
 * Job processing endpoint
 * Can be called by a cron service or manually to process pending jobs
 *
 * Security: Should be protected with a secret token in production
 */
export async function POST(request: Request) {
  try {
    // Optional: Add authentication/authorization here
    // const authHeader = request.headers.get("authorization");
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    await processJobs();

    return NextResponse.json({
      success: true,
      message: "Jobs processed successfully",
    });
  } catch (error) {
    console.error("Job processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Job processor endpoint is available",
  });
}
