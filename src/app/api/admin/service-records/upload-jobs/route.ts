import { NextRequest, NextResponse } from "next/server";
import { uploadQueue } from "@/lib/queues/upload-queue";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").toLowerCase().trim();
    const stateFilter = (searchParams.get("state") || "all").toLowerCase();
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 300);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const fromTime = from ? new Date(from).getTime() : null;
    const toTime = to ? new Date(to).getTime() : null;

    const jobs = await uploadQueue.getJobs(
      ["waiting", "active", "completed", "failed"],
      0,
      limit,
    );

    const userJobs = await Promise.all(
      jobs.map(async (job) => {
        const jobData = job.data;
        if (jobData.userId !== userId) return null;

        const state = await job.getState();
        const progressRaw = (await job.progress) as any;
        const result = state === "completed" ? await job.returnvalue : null;
        const createdAtIso = new Date(job.timestamp).toISOString();

        if (stateFilter !== "all" && state.toLowerCase() !== stateFilter) {
          return null;
        }
        if (fromTime && new Date(createdAtIso).getTime() < fromTime) {
          return null;
        }
        if (toTime && new Date(createdAtIso).getTime() > toTime) {
          return null;
        }
        if (q) {
          const haystack = [
            String(job.id || ""),
            String(jobData.fileName || ""),
            String(jobData.fingerprint || ""),
            state,
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) {
            return null;
          }
        }

        return {
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
          createdAt: createdAtIso,
          completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
          fileName: jobData.fileName,
          fingerprint: jobData.fingerprint,
          mode: jobData.mode,
          totalRowsInSheet: result?.totalRowsInSheet ?? null,
          createdRecords: result?.createdRecords ?? null,
          skippedExistingRecords: result?.skippedExistingRecords ?? null,
          invalidRows: result?.invalidRows ?? null,
        };
      }),
    );

    return NextResponse.json({
      jobs: userJobs
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date((b as any).createdAt).getTime() -
            new Date((a as any).createdAt).getTime(),
        ),
      filters: {
        q,
        state: stateFilter,
        from,
        to,
        limit,
      },
    });
  } catch (error) {
    console.error("Failed to get upload jobs:", error);
    return NextResponse.json(
      {
        error: "Failed to get upload jobs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

