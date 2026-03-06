-- Step 2: Add pvrAccess column using the newly committed 'BOTH' enum value
ALTER TABLE "user" ADD COLUMN "pvrAccess" "PVR" NOT NULL DEFAULT 'BOTH';
