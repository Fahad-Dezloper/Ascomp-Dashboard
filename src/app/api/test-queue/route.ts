import { NextResponse } from "next/server";
import { exportQueue } from "@/lib/queues/export-queue";

export async function GET() {
  try {
    const testJobData = {
      userId: "test-user-id",
      email: "test@example.com",
      columns: "all" as const,
      filters: {
        type: "none" as const,
        latestRecordsOnly: false,
        conditions: [],
        logic: "AND" as const,
      },
    };

    const job = await exportQueue.add("test-job", testJobData, {
      attempts: 1,
    });

    const jobState = await job.getState();

    return NextResponse.json({
      success: true,
      message: "Test job added to queue successfully!",
      jobId: job.id,
      jobName: job.name,
      jobState,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Queue test error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to add test job to queue",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
