import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db/standalone";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";

/**
 * Get simple job statistics
 * Requires admin role
 */
export async function GET() {
  try {
    const session = await requireAuth();

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId!),
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get job counts
    const allJobs = await db.query.backgroundJobs.findMany();

    const pending = allJobs.filter((j) => j.status === "pending").length;
    const failed = allJobs.filter((j) => j.status === "failed").length;
    const total = allJobs.length;

    // Get last processed job
    const completed = allJobs
      .filter((j) => j.status === "completed" && j.completedAt)
      .sort((a, b) => (b.completedAt! > a.completedAt! ? 1 : -1));

    const lastProcessed = completed[0]?.completedAt || null;

    return NextResponse.json({
      success: true,
      data: {
        pending,
        failed,
        total,
        lastProcessed: lastProcessed ? new Date(lastProcessed).toISOString() : null,
      },
    });
  } catch (error) {
    console.error("Get job stats error:", error);
    return NextResponse.json(
      { error: "Failed to get job statistics" },
      { status: 500 }
    );
  }
}
