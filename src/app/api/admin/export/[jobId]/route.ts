import { NextRequest, NextResponse } from "next/server";
import { exportQueue } from "@/lib/queues/export-queue";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await context.params;
    const job = await exportQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const state = await job.getState();
    const progress = (await job.progress) as number;
    const result = await job.returnvalue;
    const failedReason = job.failedReason;

    return NextResponse.json({
      jobId: job.id,
      state,
      progress: typeof progress === "number" ? progress : 0,
      result,
      failedReason,
    });
  } catch (error) {
    console.error("Failed to get job status:", error);
    return NextResponse.json(
      {
        error: "Failed to get job status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
