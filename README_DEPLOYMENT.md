# Quick Deployment Guide

## 🚀 Running Locally

### Simple Method (Two Terminals)

**Terminal 1:**
```bash
pnpm run dev
```

**Terminal 2:**
```bash
pnpm run worker:export
```

### Using PM2 (One Command)

```bash
# Install PM2 globally (one time)
npm install -g pm2

# Start both processes
pnpm run pm2:start

# View logs
pnpm run pm2:logs

# Stop both
pnpm run pm2:stop
```

## 📦 Deploying to Vercel

### Step 1: Deploy Next.js App to Vercel

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy ✅

### Step 2: Deploy Worker (Choose One)

#### Option A: Railway (Easiest) ⭐

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo
4. Add new service → "Empty Service"
5. Settings:
   - **Build Command**: `pnpm install`
   - **Start Command**: `pnpm run worker:export`
6. Add environment variables (same as Vercel)
7. Deploy ✅

#### Option B: Render

1. Go to [render.com](https://render.com)
2. New → Background Worker
3. Connect GitHub repo
4. Settings:
   - **Build Command**: `pnpm install`
   - **Start Command**: `pnpm run worker:export`
5. Add environment variables
6. Deploy ✅

## 🔑 Required Environment Variables

Both Vercel and Worker need these:

```
REDIS_URL=redis://...
DATABASE_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
GMAIL_USER=your-email@gmail.com
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
```

## ✅ Verify Deployment

1. **Next.js**: Visit your Vercel URL → Should work ✅
2. **Worker**: Check worker logs → Should see "🚀 Export worker started..."
3. **Test**: Try exporting data → Should complete and send email ✅

## 📝 Notes

- Vercel = Next.js app (serverless)
- Railway/Render = Worker (long-running process)
- Both need same `REDIS_URL` to communicate
- Worker processes jobs from the queue
