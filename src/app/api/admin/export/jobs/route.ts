import { NextRequest, NextResponse } from "next/server";
import { exportQueue } from "@/lib/queues/export-queue";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const jobs = await exportQueue.getJobs(
      ["waiting", "active", "completed", "failed"],
      0,
      100
    );

    const userJobs = await Promise.all(
      jobs.map(async (job) => {
        const state = await job.getState();
        const progress = (await job.progress) as number;
        let result: any = null;

        // Only fetch the full result for completed jobs to avoid
        // extra Redis calls on every polling tick
        if (state === "completed") {
          try {
            result = await job.returnvalue;
            if (result) {
              console.log(
                `📦 Job ${job.id} result:`,
                JSON.stringify(result, null, 2)
              );
            }
          } catch (error) {
            console.error(
              `Error getting return value for job ${job.id}:`,
              error
            );
          }
        }

        const failedReason = job.failedReason;
        const jobData = job.data;

        if (jobData.userId !== userId) {
          return null;
        }

        const jobResult = {
          jobId: job.id,
          state,
          progress: typeof progress === "number" ? progress : 0,
          result: result || null,
          failedReason,
          createdAt: new Date(job.timestamp).toISOString(),
          completedAt:
            result && job.finishedOn
              ? new Date(job.finishedOn).toISOString()
              : null,
          email: jobData.email,
          totalRecords: result?.totalRecords ?? null,
        };

        if (state === "completed" && !result) {
          console.warn(
            `⚠️ Job ${job.id} is completed but has no result. finishedOn: ${job.finishedOn}, processedOn: ${job.processedOn}`
          );
        }

        return jobResult;
      })
    );

    const filteredJobs = userJobs.filter((job) => job !== null).sort((a, b) => {
      return new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime();
    });

    return NextResponse.json({
      jobs: filteredJobs,
    });
  } catch (error) {
    console.error("Failed to get jobs:", error);
    return NextResponse.json(
      {
        error: "Failed to get jobs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
