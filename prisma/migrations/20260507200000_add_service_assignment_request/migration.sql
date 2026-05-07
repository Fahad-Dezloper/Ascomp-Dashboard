-- CreateEnum
CREATE TYPE "AssignmentRequestStatus" AS ENUM ('PENDING', 'CANCELLED', 'DENIED', 'COMPLETED');

-- CreateTable
CREATE TABLE "service_assignment_request" (
    "_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceRecordId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "assigneeIdAtRequest" TEXT NOT NULL,
    "status" "AssignmentRequestStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "service_assignment_request_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "service_assignment_request_serviceRecordId_idx" ON "service_assignment_request"("serviceRecordId");

CREATE INDEX "service_assignment_request_requesterId_idx" ON "service_assignment_request"("requesterId");

CREATE INDEX "service_assignment_request_status_idx" ON "service_assignment_request"("status");

-- AddForeignKey
ALTER TABLE "service_assignment_request" ADD CONSTRAINT "service_assignment_request_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "service_record"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_assignment_request" ADD CONSTRAINT "service_assignment_request_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
