import { Worker } from "bullmq";
import { type ExportJobData, type ExportJobResult } from "../lib/queues/export-queue";
import { processExportJob } from "../lib/export-processor";

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

const worker = new Worker<ExportJobData, ExportJobResult>(
  "export-queue",
  async (job) => {
    return await processExportJob(job.data, job);
  },
  {
    connection: parseRedisUrl(redisUrl),
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 1000 * 60,
    },
  }
);

worker.on("completed", async (job) => {
  console.log(`✅ Job ${job.id} completed!`);
  try {
    const result = await job.returnvalue;
    console.log(`📦 Job ${job.id} result:`, JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`❌ Error getting result for job ${job.id}:`, error);
  }
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed with error: ${err.message}`);
});

worker.on("error", (err) => {
  console.error(`❌ Worker error: ${err.message}`);
});

console.log("🚀 Export worker started and listening for jobs...");

// Graceful shutdown for Render/production environments
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received, closing worker gracefully...");
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received, closing worker gracefully...");
  await worker.close();
  process.exit(0);
});
