/*
  Warnings:

  - You are about to drop the column `companyPasswordHash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `companyUsername` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `gpsPasswordHash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `gpsUsername` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "companyPasswordHash",
DROP COLUMN "companyUsername",
DROP COLUMN "gpsPasswordHash",
DROP COLUMN "gpsUsername";
