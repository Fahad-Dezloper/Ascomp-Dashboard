import { Queue } from "bullmq";

export type UploadProgressStage =
  | "queued"
  | "loading-references"
  | "validating"
  | "preflight-complete"
  | "processing-chunk"
  | "completed";

export interface UploadJobProgress {
  percentage: number;
  stage: UploadProgressStage;
  message?: string;
  chunkIndex?: number;
  totalChunks?: number;
}

export interface UploadValidationError {
  row: number;
  serialNo?: string;
  email?: string;
  serviceNumber?: string;
  errors: string[];
}

export interface UploadJobData {
  userId: string;
  email: string;
  fileName: string;
  rows: Record<string, any>[];
  fingerprint: string;
  mode: "upload" | "preflight";
  chunkSize?: number;
  checkpoint?: {
    lastCompletedChunk: number;
  };
}

export interface UploadJobResult {
  fileName: string;
  fingerprint: string;
  mode: "upload" | "preflight";
  totalRowsInSheet: number;
  processedRows: number;
  emptyRowsSkipped: number;
  createdRecords: number;
  updatedRecords: number;
  skippedExistingRecords: number;
  duplicateRowsInFile: number;
  invalidRows: number;
  validationErrors: UploadValidationError[];
  durationMs: number;
}

const redisUrl = process.env.REDIS_URL as string;

if (!redisUrl) {
  throw new Error("REDIS_URL environment variable is not set");
}

function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      ...(parsed.protocol === "rediss:" && { tls: {} }),
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

export const uploadQueue = new Queue<UploadJobData, UploadJobResult>(
  "service-record-upload-queue",
  {
    connection: parseRedisUrl(redisUrl),
    defaultJobOptions: {
      removeOnComplete: {
        age: 60 * 60 * 24 * 30, // 30 days
        count: 2000,
      },
      removeOnFail: {
        age: 60 * 60 * 24 * 60, // 60 days
        count: 2000,
      },
    },
  },
);

