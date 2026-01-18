# Render Quick Start Guide (Worker Only)

## Architecture
- **Vercel**: Next.js web app (deploy separately)
- **Render**: Export worker (this guide)

## 🚀 Deploy Export Worker on Render

1. **Render Dashboard** → **"New +"** → **"Background Worker"**
2. Connect **same** GitHub repo
3. Settings:
   ```
   Name: ascomp-export-worker
   Region: (same as web service)
   Branch: main
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: pnpm install
   Start Command: pnpm run worker:export
   ```
4. Add **SAME** environment variables (especially `REDIS_URL`)
5. **Create Background Worker** ✅

## ✅ Verify

1. **Vercel App**: Visit URL → Should work
2. **Render Worker**: Check logs → Should see "🚀 Export worker started..."
3. **Test**: Export data from Vercel app → Should complete and email you

## 🔑 Critical: Environment Variables

**Render worker MUST have same env vars as Vercel:**
- ⚠️ **Same `REDIS_URL`** (CRITICAL - how they communicate!)
- Same `DATABASE_URL`
- Same `BLOB_READ_WRITE_TOKEN`
- Same email credentials
- All other env vars

## 📋 Checklist

- [ ] Next.js deployed to Vercel ✅
- [ ] Worker deployed to Render ✅
- [ ] Both have **same REDIS_URL** ✅
- [ ] Worker logs show "started and listening"
- [ ] Test export works end-to-end
- [ ] Email received

## 🐛 Troubleshooting

**Worker not starting?**
- Check logs for errors
- Verify REDIS_URL is set
- Check build completed

**Worker not processing jobs?**
- Verify REDIS_URL matches in both services
- Check worker logs
- Restart worker service

See `RENDER_DEPLOYMENT.md` for detailed guide.
