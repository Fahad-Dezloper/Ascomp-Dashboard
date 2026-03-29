import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { uploadQueue, type UploadJobData } from "@/lib/queues/upload-queue";
// Upload processor imports removed as they are now handled by the worker

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (
      !session ||
      !session.user?.id ||
      !session.user?.email ||
      session.user?.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const modeInput = String(formData.get("mode") || "upload").toLowerCase();
    const mode: "upload" | "preflight" =
      modeInput === "preflight" ? "preflight" : "upload";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel file (.xlsx or .xls)" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fingerprint = createHash("sha256")
      .update(Buffer.from(arrayBuffer))
      .digest("hex");

    const workbook = xlsx.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets["Data"];

    if (!sheet) {
      return NextResponse.json(
        {
          error:
            'Sheet "Data" not found in Excel file. Please ensure your Excel file has a sheet named "Data"',
        },
        { status: 400 },
      );
    }

    const rows: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet, {
      defval: null,
      raw: true,
    });
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Excel file is empty or has no data rows" },
        { status: 400 },
      );
    }


    const jobData: UploadJobData = {
      userId: session.user.id,
      email: session.user.email,
      fileName: file.name,
      rows,
      fingerprint,
      mode: mode as "upload" | "preflight",
      chunkSize: 500,
    };

    const existingJobs = await uploadQueue.getJobs(
      ["waiting", "active", "delayed"],
      0,
      200,
    );
    const duplicateJob = existingJobs.find((job) => {
      const isSameUser = job.data.userId === session.user.id;
      const isSameFingerprint = job.data.fingerprint === fingerprint;
      const isSameMode = job.data.mode === mode;
      // prevent stale collisions beyond 24h
      const isRecent = Date.now() - job.timestamp < 1000 * 60 * 60 * 24;
      return isSameUser && isSameFingerprint && isSameMode && isRecent;
    });

    if (duplicateJob) {
      const duplicateState = await duplicateJob.getState();
      const duplicateProgress = await duplicateJob.progress;
      const duplicateResult =
        duplicateState === "completed" ? await duplicateJob.returnvalue : null;

      return NextResponse.json({
        success: true,
        deduplicated: true,
        message: "An identical upload job already exists. Reusing previous job.",
        jobId: duplicateJob.id,
        state: duplicateState,
        progress:
          typeof duplicateProgress === "number"
            ? { percentage: duplicateProgress, stage: "queued" }
            : duplicateProgress,
        totalRows: rows.length,
        fingerprint,
        result: duplicateResult,
      });
    };

    const job = await uploadQueue.add("service-record-upload", jobData, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    });

    return NextResponse.json({
      success: true,
      message: `${mode === "preflight" ? "Preflight" : "Upload"} job queued successfully`,
      jobId: job.id,
      totalRows: rows.length,
      fingerprint,
      mode,
    });
  } catch (error) {
    console.error("Excel upload queue error:", error);
    return NextResponse.json(
      {
        error: "Failed to queue upload job",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}