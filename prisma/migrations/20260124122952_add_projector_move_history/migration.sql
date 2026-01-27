-- AlterEnum
ALTER TYPE "ServiceStatus" ADD VALUE 'PACKED';

-- CreateTable
CREATE TABLE "projector_move_history" (
    "_id" TEXT NOT NULL,
    "projectorId" TEXT NOT NULL,
    "fromSiteId" TEXT NOT NULL,
    "fromSiteName" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toSiteId" TEXT NOT NULL,
    "toSiteName" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projector_move_history_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "projector_move_history_projectorId_idx" ON "projector_move_history"("projectorId");

-- AddForeignKey
ALTER TABLE "projector_move_history" ADD CONSTRAINT "projector_move_history_projectorId_fkey" FOREIGN KEY ("projectorId") REFERENCES "projector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
