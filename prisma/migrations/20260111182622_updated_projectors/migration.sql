-- CreateEnum
CREATE TYPE "PVR" AS ENUM ('PVR', 'NonPVR');

-- AlterTable
ALTER TABLE "projector" ADD COLUMN     "address" TEXT,
ADD COLUMN     "pvr" "PVR",
ADD COLUMN     "region" TEXT,
ADD COLUMN     "state" TEXT;
