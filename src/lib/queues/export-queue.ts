import { Queue } from "bullmq";

export interface ExportJobData {
  userId: string;
  email: string;
  columns: string[] | "all";
  filters: {
    type: "none" | "current" | "custom";
    latestRecordsOnly: boolean;
    conditions: Array<{
      id: string;
      table: "projector" | "site" | "serviceRecord";
      field: string;
      operator: string;
      value: string;
      value2?: string;
    }>;
    logic: "AND" | "OR";
    currentFilters?: {
      search?: string;
      workerFilter?: string;
      startDate?: string;
    };
  };
}

export interface ExportJobResult {
  fileUrl: string;
  fileName: string;
  totalRecords: number;
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

export const exportQueue = new Queue<ExportJobData, ExportJobResult>(
  "export-queue",
  {
    connection: parseRedisUrl(redisUrl),
  }
);
