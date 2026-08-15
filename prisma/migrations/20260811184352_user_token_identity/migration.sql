-- AlterEnum
BEGIN;
CREATE TYPE "LogSource_new" AS ENUM ('WEB', 'API', 'SYSTEM');
ALTER TABLE "AuditLog" ALTER COLUMN "source" TYPE "LogSource_new" USING ("source"::text::"LogSource_new");
ALTER TYPE "LogSource" RENAME TO "LogSource_old";
ALTER TYPE "LogSource_new" RENAME TO "LogSource";
DROP TYPE "LogSource_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "CredentialUsageLog" DROP CONSTRAINT "CredentialUsageLog_phoneNumber_fkey";

-- DropIndex
DROP INDEX "CredentialUsageLog_phoneNumber_service_idx";

-- DropIndex
DROP INDEX "User_phoneNumber_idx";

-- DropIndex
DROP INDEX "User_phoneNumber_key";

-- AlterTable
ALTER TABLE "CredentialUsageLog" DROP COLUMN "phoneNumber",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "phoneNumber",
ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "companyPasswordEncrypted" TEXT,
ADD COLUMN     "companyUsername" TEXT,
ADD COLUMN     "credentialsStatus" "CredentialStatus" NOT NULL DEFAULT 'SETUP_PENDING',
ADD COLUMN     "gpsPasswordEncrypted" TEXT,
ADD COLUMN     "gpsUsername" TEXT,
ADD COLUMN     "lastValidationSuccess" TIMESTAMP(3);

-- DropTable
DROP TABLE "WhatsappSession";

-- CreateIndex
CREATE INDEX "CredentialUsageLog_userId_service_idx" ON "CredentialUsageLog"("userId", "service");

-- CreateIndex
CREATE UNIQUE INDEX "User_accessToken_key" ON "User"("accessToken");

-- CreateIndex
CREATE INDEX "User_accessToken_idx" ON "User"("accessToken");

-- AddForeignKey
ALTER TABLE "CredentialUsageLog" ADD CONSTRAINT "CredentialUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
