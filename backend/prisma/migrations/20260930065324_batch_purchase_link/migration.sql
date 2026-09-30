-- AlterTable
ALTER TABLE "ProductBatch" ADD COLUMN     "purchaseId" TEXT;

-- CreateIndex
CREATE INDEX "ProductBatch_purchaseId_idx" ON "ProductBatch"("purchaseId");
