# Deployment Guide

## Running Locally (Development)

### Option 1: Two Terminal Windows (Recommended)

**Terminal 1 - Next.js Dev Server:**
```bash
pnpm run dev
```

**Terminal 2 - Export Worker:**
```bash
pnpm run worker:export
```

### Option 2: Using a Process Manager (PM2)

Install PM2 globally:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'nextjs-dev',
      script: 'pnpm',
      args: 'run dev',
      cwd: './',
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'export-worker',
      script: 'pnpm',
      args: 'run worker:export',
      cwd: './',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
```

Run both:
```bash
pm2 start ecosystem.config.js
pm2 logs  # View logs from both processes
pm2 stop all  # Stop both processes
```

## Deploying to Vercel

### Architecture Overview

Vercel doesn't support long-running processes, so you need to:
1. **Deploy Next.js app to Vercel** (main application)
2. **Deploy worker separately** to a service that supports long-running processes

### Step 1: Deploy Next.js App to Vercel

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard:
   - `REDIS_URL` - Your Redis connection string
   - `DATABASE_URL` - Your database connection string
   - `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
   - `GMAIL_USER` - Gmail address for sending emails
   - `GMAIL_CLIENT_ID` - Gmail OAuth client ID
   - `GMAIL_CLIENT_SECRET` - Gmail OAuth client secret
   - `GMAIL_REFRESH_TOKEN` - Gmail OAuth refresh token
   - All other required environment variables

4. Vercel will automatically detect Next.js and deploy

### Step 2: Deploy Worker Separately

Choose one of these options:

#### Option A: Railway (Recommended - Easy Setup)

1. Go to [Railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Add a new service → "Empty Service"
5. Configure:
   - **Build Command**: `pnpm install`
   - **Start Command**: `pnpm run worker:export`
   - **Root Directory**: `/` (root of your repo)
6. Add environment variables (same as Vercel)
7. Deploy

#### Option B: Render

1. Go to [Render.com](https://render.com)
2. Create a new "Background Worker"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `pnpm install`
   - **Start Command**: `pnpm run worker:export`
5. Add environment variables
6. Deploy

#### Option C: Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Create `fly.toml`:
```toml
app = "your-app-worker"
primary_region = "iad"

[build]

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 3001
  protocol = "tcp"
```

3. Deploy:
```bash
fly launch
fly deploy
```

#### Option D: DigitalOcean App Platform

1. Go to DigitalOcean App Platform
2. Create a new app → "Worker"
3. Connect repository
4. Configure build/start commands
5. Add environment variables
6. Deploy

### Step 3: Verify Worker is Running

After deploying the worker, check the logs to ensure it's connected to Redis and listening for jobs:

```bash
# Railway
railway logs

# Render
# Check logs in Render dashboard

# Fly.io
fly logs
```

You should see:
```
🚀 Export worker started and listening for jobs...
```

## Environment Variables Checklist

Make sure both Vercel (Next.js) and your worker service have these:

- ✅ `REDIS_URL` - Redis connection string (same for both)
- ✅ `DATABASE_URL` - Database connection string
- ✅ `BLOB_READ_WRITE_TOKEN` - Vercel Blob token
- ✅ `GMAIL_USER` - Email sender address
- ✅ `GMAIL_CLIENT_ID` - OAuth client ID
- ✅ `GMAIL_CLIENT_SECRET` - OAuth client secret
- ✅ `GMAIL_REFRESH_TOKEN` - OAuth refresh token
- ✅ All other app-specific environment variables

## Testing the Deployment

1. **Test Next.js App:**
   - Visit your Vercel deployment URL
   - Login and navigate to the overview page
   - Try exporting data

2. **Test Worker:**
   - Check worker logs to see if jobs are being processed
   - The export should complete and send an email

## Monitoring

### Vercel Dashboard
- Monitor Next.js app performance
- Check API route logs
- View deployment status

### Worker Service Dashboard
- Monitor worker uptime
- Check worker logs for errors
- View resource usage

### Redis Dashboard
- Monitor queue size
- Check for stuck jobs
- View connection status

## Troubleshooting

### Worker Not Processing Jobs

1. **Check Redis Connection:**
   - Verify `REDIS_URL` is correct in worker service
   - Test Redis connection from worker logs

2. **Check Worker Logs:**
   - Look for connection errors
   - Check for job processing errors

3. **Verify Queue Name:**
   - Ensure queue name matches: `export-queue`

### Jobs Stuck in Queue

1. Clear the queue:
   ```bash
   pnpm run clear:export-queue
   ```

2. Restart the worker service

### Email Not Sending

1. Check Gmail OAuth credentials
2. Verify email environment variables
3. Check worker logs for email errors

## Production Checklist

- [ ] Next.js app deployed to Vercel
- [ ] Worker deployed to external service
- [ ] All environment variables configured
- [ ] Redis connection working
- [ ] Database connection working
- [ ] Email sending working
- [ ] Worker processing jobs successfully
- [ ] Monitoring set up
- [ ] Error logging configured
