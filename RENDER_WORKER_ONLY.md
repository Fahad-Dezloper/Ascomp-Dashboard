# Render Worker Deployment (Vercel + Render Setup)

## Architecture

- **Vercel**: Next.js web application
- **Render**: Background worker for export jobs

Both services communicate via **Redis** (same `REDIS_URL`).

## Step 1: Deploy Next.js to Vercel

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy ✅

**Vercel Environment Variables:**
```
REDIS_URL=redis://... (same as Render)
DATABASE_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
GMAIL_USER=your-email@gmail.com
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
# Add all other required env vars
```

## Step 2: Deploy Worker to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Background Worker"**
3. Connect your GitHub repository
4. Configure the worker:

   **Basic Settings:**
   - **Name**: `ascomp-export-worker`
   - **Region**: Choose closest to your Redis/Vercel region
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install && bunx prisma generate`
   - **Start Command**: `pnpm run worker:export`

   **Environment Variables:**
   Add the **same environment variables** as Vercel:
   ```
   NODE_ENV=production
   REDIS_URL=redis://... (MUST match Vercel exactly)
   DATABASE_URL=postgresql://...
   BLOB_READ_WRITE_TOKEN=vercel_blob_...
   GMAIL_USER=your-email@gmail.com
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN=...
   # Add all other required env vars (same as Vercel)
   ```

5. Click **"Create Background Worker"**
6. Wait for deployment to complete ✅

## Step 3: Verify Deployment

### Check Vercel
1. Visit your Vercel deployment URL
2. App should be running
3. Try logging in and navigating

### Check Render Worker
1. Go to Render dashboard → Your worker service
2. Click **"Logs"** tab
3. You should see:
   ```
   🚀 Export worker started and listening for jobs...
   ```
4. If you see errors, check:
   - Redis connection (REDIS_URL)
   - Environment variables match Vercel

### Test End-to-End
1. In your Vercel app, go to overview page
2. Click "Export" button
3. Configure export and submit
4. Check Render worker logs → Should see job processing:
   ```
   📦 Starting export job for user...
   📊 Found X records to export
   ✅ Generated X PDFs
   📝 Creating Excel file...
   ✅ Excel file uploaded: ...
   📧 Sending email notification...
   ✅ Email sent successfully
   ```
5. Check your email → Should receive download link ✅

## Critical: Environment Variables

### ⚠️ IMPORTANT: REDIS_URL Must Match

**Both Vercel and Render MUST have the exact same `REDIS_URL`**

This is how they communicate:
- Vercel (Next.js) → Queues jobs to Redis
- Render (Worker) → Reads jobs from Redis

If they don't match, jobs won't be processed!

### Environment Variables Checklist

**Vercel (Next.js):**
- ✅ `REDIS_URL` (same as Render)
- ✅ `DATABASE_URL`
- ✅ `BLOB_READ_WRITE_TOKEN`
- ✅ Email credentials
- ✅ All other app env vars

**Render (Worker):**
- ✅ `REDIS_URL` (same as Vercel - CRITICAL!)
- ✅ `DATABASE_URL` (same as Vercel)
- ✅ `BLOB_READ_WRITE_TOKEN` (same as Vercel)
- ✅ Email credentials (same as Vercel)
- ✅ All other env vars (same as Vercel)

## Troubleshooting

### Worker Not Starting

**Check Render logs for:**
- `REDIS_URL environment variable is not set`
  → Add `REDIS_URL` in Render environment variables
  
- Connection errors
  → Verify `REDIS_URL` is correct and accessible from Render

- Module not found errors
  → Check build completed successfully (check build logs)

### Worker Not Processing Jobs

1. **Verify REDIS_URL matches:**
   - Check Vercel env vars → Copy `REDIS_URL`
   - Check Render env vars → Should be identical
   - If different, update Render to match Vercel

2. **Check Redis connection:**
   - Worker logs should show "started and listening"
   - No connection errors in logs

3. **Test Redis:**
   - Jobs queued from Vercel should appear in Redis
   - Worker should pick them up automatically

### Jobs Stuck in Queue

1. **Clear the queue:**
   ```bash
   # Run locally with same REDIS_URL
   pnpm run clear:export-queue
   ```

2. **Restart worker:**
   - Render dashboard → Worker → Manual Deploy
   - Or restart service

### Email Not Sending

1. Check Gmail OAuth credentials in Render
2. Verify email env vars match Vercel
3. Check worker logs for email errors

### Build Failures on Render

**Common issues:**
- `pnpm` not found → Ensure Node runtime is selected
- Build timeout → Render free tier has limits
- Dependencies fail → Check `package.json` is correct

**Solution:**
- Check build logs in Render dashboard
- Ensure `pnpm install` completes successfully
- Verify all dependencies are in `package.json`

## Monitoring

### Vercel Dashboard
- Monitor Next.js app performance
- Check API route logs (`/api/admin/export`)
- View deployment status

### Render Dashboard
- Monitor worker uptime
- Check worker logs for errors
- View resource usage
- Set up alerts for failures

### Redis Dashboard
- Monitor queue size
- Check for stuck jobs
- View connection status

## Production Checklist

- [ ] Next.js app deployed to Vercel
- [ ] Worker deployed to Render
- [ ] Both have **same REDIS_URL** ✅
- [ ] All environment variables configured
- [ ] Worker logs show "started and listening"
- [ ] Test export works end-to-end
- [ ] Email notifications working
- [ ] Monitoring set up

## Cost

- **Vercel**: Free tier available (generous limits)
- **Render Worker**: Free tier available (750 hours/month)
- **Redis**: Use Upstash (free tier) or Render Redis

## Quick Reference

**Deploy Worker:**
```
Render Dashboard → New + → Background Worker
Build: pnpm install
Start: pnpm run worker:export
Env Vars: Same as Vercel (especially REDIS_URL)
```

**Verify:**
```
Worker logs → "🚀 Export worker started..."
Test export → Should complete and email you
```
