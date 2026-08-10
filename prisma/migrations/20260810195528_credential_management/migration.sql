-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('SETUP_PENDING', 'ACTIVE', 'INVALID_CREDENTIALS');

-- DropForeignKey
ALTER TABLE "WhatsappSession" DROP CONSTRAINT "WhatsappSession_userId_fkey";

-- DropIndex
DROP INDEX "WhatsappSession_userId_idx";

-- DropIndex
DROP INDEX "WhatsappSession_userId_key";

-- AlterTable
ALTER TABLE "WhatsappSession" DROP COLUMN "isConnected",
DROP COLUMN "lastActivityAt",
DROP COLUMN "sessionData",
DROP COLUMN "userId",
ADD COLUMN     "companyPasswordEncrypted" TEXT,
ADD COLUMN     "companyUsername" TEXT,
ADD COLUMN     "credentialsStatus" "CredentialStatus" NOT NULL DEFAULT 'SETUP_PENDING',
ADD COLUMN     "gpsPasswordEncrypted" TEXT,
ADD COLUMN     "gpsUsername" TEXT,
ADD COLUMN     "lastValidationSuccess" TIMESTAMP(3),
ADD COLUMN     "setupToken" TEXT,
ADD COLUMN     "setupTokenExpiresAt" TIMESTAMP(3),
ALTER COLUMN "phoneNumber" SET NOT NULL;

-- CreateTable
CREATE TABLE "WhatsappConnection" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "phoneNumber" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialUsageLog" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredentialUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsappConnection_userId_idx" ON "WhatsappConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappConnection_userId_key" ON "WhatsappConnection"("userId");

-- CreateIndex
CREATE INDEX "CredentialUsageLog_phoneNumber_service_idx" ON "CredentialUsageLog"("phoneNumber", "service");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSession_phoneNumber_key" ON "WhatsappSession"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSession_setupToken_key" ON "WhatsappSession"("setupToken");

-- CreateIndex
CREATE INDEX "WhatsappSession_phoneNumber_idx" ON "WhatsappSession"("phoneNumber");

-- AddForeignKey
ALTER TABLE "WhatsappConnection" ADD CONSTRAINT "WhatsappConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialUsageLog" ADD CONSTRAINT "CredentialUsageLog_phoneNumber_fkey" FOREIGN KEY ("phoneNumber") REFERENCES "WhatsappSession"("phoneNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
