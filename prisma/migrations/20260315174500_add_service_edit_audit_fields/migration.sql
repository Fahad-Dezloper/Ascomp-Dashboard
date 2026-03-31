-- AlterTable
ALTER TABLE "service_record"
ADD COLUMN "lastEditedAt" TIMESTAMP(3),
ADD COLUMN "lastEditedById" TEXT,
ADD COLUMN "editCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "service_record_lastEditedById_idx" ON "service_record"("lastEditedById");

-- AddForeignKey
ALTER TABLE "service_record"
ADD CONSTRAINT "service_record_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "user"("_id") ON DELETE SET NULL ON UPDATE CASCADE;
