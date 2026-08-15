/*
  Warnings:

  - Added the required column `expenseDate` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "expenseDate" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");
