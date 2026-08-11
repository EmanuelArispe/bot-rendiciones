/*
  Warnings:

  - You are about to drop the `WhatsappConnection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WhatsappConnection" DROP CONSTRAINT "WhatsappConnection_userId_fkey";

-- DropTable
DROP TABLE "WhatsappConnection";
