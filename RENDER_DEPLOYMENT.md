# Render Deployment Guide (Worker Only)

## Overview

This guide is for deploying **only the export worker** on Render.
Your Next.js app should be deployed on **Vercel**.

**Architecture:**
- **Vercel**: Next.js web application
- **Render**: Background worker for export jobs
- **Redis**: Communication bridge (same `REDIS_URL` in both)

## Step 1: Deploy Next.js to Vercel (If Not Done)

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy ✅

**Vercel Environment Variables:**
```
REDIS_URL=redis://... (will be same as Render)
DATABASE_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
GMAIL_USER=your-email@gmail.com
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
# Add all other required env vars
```

## Step 2: Deploy Export Worker to Render

1. In Render Dashboard, click **"New +"** → **"Background Worker"**
2. Connect the **same GitHub repository**
3. Configure the worker:

   **Basic Settings:**
   - **Name**: `ascomp-export-worker`
   - **Region**: Same as web service (or closest)
   - **Branch**: `main` (same as web service)
   - **Root Directory**: Leave empty
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install`
   - **Start Command**: `pnpm run worker:export`

   **Environment Variables:**
   Add the **same environment variables** as Vercel:
   ```
   NODE_ENV=production
   REDIS_URL=redis://... (MUST match Vercel exactly!)
   DATABASE_URL=postgresql://...
   BLOB_READ_WRITE_TOKEN=vercel_blob_...
   GMAIL_USER=your-email@gmail.com
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN=...
   # Add all other required env vars (same as Vercel)
   ```
   
   ⚠️ **CRITICAL**: `REDIS_URL` must be **identical** in both Vercel and Render!

4. Click **"Create Background Worker"**
5. Wait for deployment to complete ✅

## Step 3: Verify Deployment

### Check Vercel App
1. Visit your Vercel deployment URL
2. Should see your Next.js app running
3. Try logging in and navigating

### Check Render Worker
1. Go to worker service dashboard
2. Click **"Logs"** tab
3. You should see:
   ```
   🚀 Export worker started and listening for jobs...
   ```
4. If you see errors, check:
   - Redis connection (REDIS_URL)
   - Environment variables are set correctly

### Test Export
1. In your web app, go to overview page
2. Click "Export" button
3. Configure export and submit
4. Check worker logs - should see job processing
5. Check your email - should receive download link

## Important Notes

### Environment Variables
- **Both services MUST have the same `REDIS_URL`** - This is how they communicate
- All other env vars should be identical
- Use Render's **Environment Groups** feature to share env vars between services

### Using Environment Groups (Optional)

If you have multiple workers or want to manage env vars easily:
1. Go to **"Environment"** → **"Environment Groups"**
2. Create new group: `ascomp-production`
3. Add all environment variables
4. When creating worker, select this group

### Redis Setup

**Option 1: External Redis (Recommended)**
- Use Upstash (free tier available)
- Or Redis Cloud
- Copy connection string to both Vercel and Render

**Option 2: Render Redis**
- Create Redis instance in Render
- Get connection string from Redis dashboard
- Use that as `REDIS_URL` in both Vercel and Render

### Monitoring

**Vercel:**
- Monitor Next.js app in Vercel dashboard
- Check API route logs (`/api/admin/export`)
- Monitor response times

**Render Worker:**
- Check worker logs regularly
- Monitor for stuck jobs
- Set up alerts for failures
- View resource usage

## Troubleshooting

### Worker Not Starting

**Check logs for:**
- `REDIS_URL environment variable is not set` → Add REDIS_URL
- Connection errors → Verify Redis URL is correct
- Module not found → Check build completed successfully

### Worker Not Processing Jobs

1. **Verify REDIS_URL matches:**
   - Check Vercel env vars → Copy `REDIS_URL`
   - Check Render env vars → Should be **identical**
   - If different, update Render to match Vercel exactly

2. **Check Redis connection:**
   - Check worker logs for connection errors
   - Ensure REDIS_URL is correct and accessible

3. **Check queue:**
   - Jobs queued from Vercel should appear in Redis
   - Worker should pick them up automatically

4. **Restart worker:**
   - In Render dashboard → Worker → Manual Deploy → Clear build cache & deploy

### Jobs Stuck

1. Clear the queue:
   ```bash
   # Run locally with same REDIS_URL
   pnpm run clear:export-queue
   ```

2. Restart worker service

### Build Failures

**Web Service:**
- Check build logs
- Ensure `pnpm install` completes
- Verify `pnpm run build` succeeds

**Worker:**
- Check build logs
- Ensure all dependencies installed
- Verify start command is correct

## Cost Optimization

- **Web Service**: Pay per usage (free tier available)
- **Worker**: Pay per usage (free tier available)
- **Redis**: Use Render Redis or external (Upstash free tier)

## Production Checklist

- [ ] Next.js app deployed to Vercel ✅
- [ ] Worker deployed to Render ✅
- [ ] Both have **same REDIS_URL** (CRITICAL!) ✅
- [ ] All environment variables configured
- [ ] Worker logs show "started and listening"
- [ ] Test export works end-to-end
- [ ] Email notifications working
- [ ] Monitoring set up

## Support

If you encounter issues:
1. Check Render logs (both services)
2. Verify environment variables
3. Test Redis connection
4. Check worker logs for specific errors
