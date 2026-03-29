import { NextRequest, NextResponse } from "next/server";
import { uploadQueue } from "@/lib/queues/upload-queue";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await context.params;
    const job = await uploadQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.data.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const state = await job.getState();
    const progressRaw = (await job.progress) as any;
    const result = state === "completed" ? await job.returnvalue : null;

    return NextResponse.json({
      jobId: job.id,
      state,
      progress:
        typeof progressRaw === "number"
          ? { percentage: progressRaw, stage: "queued" }
          : {
              percentage: progressRaw?.percentage ?? 0,
              stage: progressRaw?.stage ?? "queued",
              message: progressRaw?.message,
              chunkIndex: progressRaw?.chunkIndex,
              totalChunks: progressRaw?.totalChunks,
            },
      result,
      failedReason: job.failedReason,
      fileName: job.data.fileName,
      fingerprint: job.data.fingerprint,
      mode: job.data.mode,
      checkpoint: job.data.checkpoint,
    });
  } catch (error) {
    console.error("Failed to get upload job status:", error);
    return NextResponse.json(
      {
        error: "Failed to get upload job status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

