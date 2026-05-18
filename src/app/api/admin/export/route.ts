import { NextRequest, NextResponse } from "next/server";
import { exportQueue, type ExportJobData } from "@/lib/queues/export-queue";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session || !session.user || !session.user.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { columns, filters, email } = body;

    if (!columns || !filters) {
      return NextResponse.json(
        { error: "Missing required fields: columns and filters" },
        { status: 400 }
      );
    }

    const jobData: ExportJobData = {
      userId: session.user.id,
      email: email || session.user.email,
      columns,
      filters: {
        ...filters,
        // Ensure reportType is passed through (defaults to "all" in processor if missing)
        reportType: filters.reportType ?? "all",
      },
    };

    const job = await exportQueue.add("export-data", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Export job queued successfully",
      jobId: job.id,
    });
    } catch (error) {
    console.error("Failed to queue export job:", error);
    return NextResponse.json(
      {
        error: "Failed to queue export job",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
    }
}
