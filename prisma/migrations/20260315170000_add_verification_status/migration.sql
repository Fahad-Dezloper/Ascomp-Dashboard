-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED');

-- AlterTable
ALTER TABLE "service_record"
ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "verifiedById" TEXT;

-- CreateIndex
CREATE INDEX "service_record_verificationStatus_idx" ON "service_record"("verificationStatus");

-- CreateIndex
CREATE INDEX "service_record_verifiedById_idx" ON "service_record"("verifiedById");

-- AddForeignKey
ALTER TABLE "service_record"
ADD CONSTRAINT "service_record_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "user"("_id") ON DELETE SET NULL ON UPDATE CASCADE;
