# Export System Setup with BullMQ

This document explains how to set up and use the background export system with BullMQ and Redis.

## Prerequisites

1. **Redis Server**: You need a Redis instance running. Options:
   - Local: Install Redis locally or use Docker
   - Cloud: Use Redis Cloud, Upstash, or similar service

2. **Environment Variables**: Add to your `.env` file:
   ```
   REDIS_URL=redis://localhost:6379
   # Or for cloud Redis:
   # REDIS_URL=rediss://your-redis-url:6380
   ```

## Installation

1. Install dependencies (if not already installed):
   ```bash
   pnpm install bullmq ioredis
   ```

## Running the Worker

The export worker processes jobs in the background. You need to run it separately:

### Development
```bash
pnpm run worker:export
```

### Production
Run the worker as a separate process/service. Options:
- PM2: `pm2 start src/workers/export-worker.ts --name export-worker`
- Docker: Create a separate container
- Systemd: Create a systemd service

## How It Works

1. **User clicks Export** → API route queues a job in Redis
2. **Worker picks up job** → Processes data in chunks (50 records at a time)
3. **PDFs generated** → Each service record gets a PDF generated
4. **Excel created** → All data + PDF links in one Excel file
5. **Files uploaded** → Excel and PDFs uploaded to Vercel Blob storage
6. **Email sent** → User receives email with download link

## Features

- ✅ Jobs continue even if user closes browser
- ✅ Processes large datasets in chunks (memory efficient)
- ✅ Retries on failure (3 attempts with exponential backoff)
- ✅ Progress tracking (can be extended for UI)
- ✅ Automatic cleanup (old jobs removed after 24 hours)

## API Endpoint

`POST /api/admin/export`

Request body:
```json
{
  "columns": ["all"] | ["column1", "column2", ...],
  "filters": {
    "type": "none" | "current" | "custom",
    "latestRecordsOnly": boolean,
    "conditions": [...],
    "logic": "AND" | "OR"
  },
  "email": "user@example.com"
}
```

## Troubleshooting

### Worker not processing jobs
- Check Redis connection: `redis-cli ping`
- Verify `REDIS_URL` is set correctly
- Check worker logs for errors

### PDFs not generating
- Ensure service records have all required data
- Check blob storage credentials
- Verify email service is configured

### Jobs stuck
- Check Redis for stuck jobs: `redis-cli KEYS "bull:export:*"`
- Clear stuck jobs if needed (use BullMQ dashboard or Redis CLI)

## Next Steps

1. Set up Redis (local or cloud)
2. Add `REDIS_URL` to `.env`
3. Run `pnpm run worker:export` in a separate terminal
4. Test export functionality
