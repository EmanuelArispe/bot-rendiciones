/*
  Warnings:

  - You are about to drop the column `destination` on the `Rendicion` table. All the data in the column will be lost.
  - You are about to drop the column `destinationCode` on the `Rendicion` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `Rendicion` table. All the data in the column will be lost.
  - You are about to drop the column `originCode` on the `Rendicion` table. All the data in the column will be lost.
  - You are about to drop the column `travelDate` on the `Rendicion` table. All the data in the column will be lost.
  - Added the required column `destinationCity` to the `Rendicion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinationProvince` to the `Rendicion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinationProvinceCode` to the `Rendicion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originCity` to the `Rendicion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originProvince` to the `Rendicion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originProvinceCode` to the `Rendicion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `travelDateFrom` to the `Rendicion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `travelDateTo` to the `Rendicion` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Rendicion_travelDate_idx";

-- AlterTable
ALTER TABLE "Rendicion" DROP COLUMN "destination",
DROP COLUMN "destinationCode",
DROP COLUMN "origin",
DROP COLUMN "originCode",
DROP COLUMN "travelDate",
ADD COLUMN     "destinationCity" TEXT NOT NULL,
ADD COLUMN     "destinationProvince" TEXT NOT NULL,
ADD COLUMN     "destinationProvinceCode" TEXT NOT NULL,
ADD COLUMN     "originCity" TEXT NOT NULL,
ADD COLUMN     "originProvince" TEXT NOT NULL,
ADD COLUMN     "originProvinceCode" TEXT NOT NULL,
ADD COLUMN     "travelDateFrom" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "travelDateTo" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "originCity" TEXT,
ADD COLUMN     "originProvince" TEXT,
ADD COLUMN     "originProvinceCode" TEXT;

-- CreateIndex
CREATE INDEX "Rendicion_travelDateFrom_idx" ON "Rendicion"("travelDateFrom");
