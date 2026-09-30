-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'SUPPLIER_LEND';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "form" TEXT NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "genericName" TEXT,
ADD COLUMN     "piecesPerStrip" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "stripsPerBox" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN     "pieces" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "pieces" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "ProductBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchNo" TEXT,
    "expiry" TIMESTAMP(3),
    "qty" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBatch_tenantId_expiry_idx" ON "ProductBatch"("tenantId", "expiry");

-- CreateIndex
CREATE INDEX "ProductBatch_productId_idx" ON "ProductBatch"("productId");

-- CreateIndex
CREATE INDEX "Product_tenantId_barcode_idx" ON "Product"("tenantId", "barcode");

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
