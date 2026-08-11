/*
  Warnings:

  - Changed the type of `source` on the `AuditLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `service` on the `CredentialUsageLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CredentialUsageService" AS ENUM ('GPS', 'FORM');

-- CreateEnum
CREATE TYPE "LogSource" AS ENUM ('WHATSAPP', 'WEB', 'API', 'SYSTEM');

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "source",
ADD COLUMN     "source" "LogSource" NOT NULL;

-- AlterTable
ALTER TABLE "CredentialUsageLog" DROP COLUMN "service",
ADD COLUMN     "service" "CredentialUsageService" NOT NULL;

-- CreateIndex
CREATE INDEX "CredentialUsageLog_phoneNumber_service_idx" ON "CredentialUsageLog"("phoneNumber", "service");
