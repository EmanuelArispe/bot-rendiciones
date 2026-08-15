/*
  Warnings:

  - You are about to drop the column `credentialsStatus` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastValidationSuccess` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "credentialsStatus",
DROP COLUMN "lastValidationSuccess",
ADD COLUMN     "companyCredentialsStatus" "CredentialStatus" NOT NULL DEFAULT 'SETUP_PENDING',
ADD COLUMN     "companyLastValidationSuccess" TIMESTAMP(3),
ADD COLUMN     "gpsCredentialsStatus" "CredentialStatus" NOT NULL DEFAULT 'SETUP_PENDING',
ADD COLUMN     "gpsLastValidationSuccess" TIMESTAMP(3);
