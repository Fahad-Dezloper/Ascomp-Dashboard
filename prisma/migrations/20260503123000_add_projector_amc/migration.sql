-- CreateTable
CREATE TABLE "projector_amc" (
    "_id" TEXT NOT NULL,
    "projectorId" TEXT NOT NULL,
    "siteNameSnapshot" TEXT NOT NULL,
    "modelNoSnapshot" TEXT NOT NULL,
    "serialNoSnapshot" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "clientPoNumber" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "certificateBlobUrl" TEXT,
    "certificateIssuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projector_amc_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projector_amc_certificateNumber_key" ON "projector_amc"("certificateNumber");

-- CreateIndex
CREATE INDEX "projector_amc_projectorId_idx" ON "projector_amc"("projectorId");

-- CreateIndex
CREATE INDEX "projector_amc_startDate_endDate_idx" ON "projector_amc"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "projector_amc" ADD CONSTRAINT "projector_amc_projectorId_fkey" FOREIGN KEY ("projectorId") REFERENCES "projector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
