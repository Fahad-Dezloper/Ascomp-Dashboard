import { Worker } from "bullmq";
import { type ExportJobData, type ExportJobResult } from "../lib/queues/export-queue";
import { processExportJob } from "../lib/export-processor";
import { type UploadJobData, type UploadJobResult } from "../lib/queues/upload-queue";
import { processUploadJob } from "../lib/upload-processor";

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

const uploadWorker = new Worker<UploadJobData, UploadJobResult>(
  "service-record-upload-queue",
  async (job) => {
    return await processUploadJob(job.data, job);
  },
  {
    connection: parseRedisUrl(redisUrl),
    concurrency: 2,
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

uploadWorker.on("completed", async (job) => {
  console.log(`✅ Upload job ${job.id} completed!`);
  try {
    const result = await job.returnvalue;
    console.log(`📦 Upload job ${job.id} result:`, JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`❌ Error getting result for upload job ${job.id}:`, error);
  }
});

uploadWorker.on("failed", (job, err) => {
  console.error(`❌ Upload job ${job?.id} failed with error: ${err.message}`);
});

uploadWorker.on("error", (err) => {
  console.error(`❌ Upload worker error: ${err.message}`);
});

console.log("🚀 Export and upload workers started and listening for jobs...");

function shutdown(signal: string) {
  console.log(`\n🛑 ${signal} received, stopping immediately...`);
  worker.close().catch(() => {});
  uploadWorker.close().catch(() => {});
  setTimeout(() => process.exit(0), 1000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
