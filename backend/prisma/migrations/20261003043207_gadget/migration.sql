-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('IN_STOCK', 'SOLD');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "trackSerial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variant" TEXT,
ADD COLUMN     "warrantyMonths" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProductUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'IN_STOCK',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchaseId" TEXT,
    "saleId" TEXT,
    "saleItemId" TEXT,
    "soldAt" TIMESTAMP(3),
    "warrantyEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductUnit_tenantId_productId_status_idx" ON "ProductUnit"("tenantId", "productId", "status");

-- CreateIndex
CREATE INDEX "ProductUnit_saleId_idx" ON "ProductUnit"("saleId");

-- CreateIndex
CREATE INDEX "ProductUnit_saleItemId_idx" ON "ProductUnit"("saleItemId");

-- CreateIndex
CREATE INDEX "ProductUnit_purchaseId_idx" ON "ProductUnit"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnit_tenantId_serial_key" ON "ProductUnit"("tenantId", "serial");

-- CreateIndex
CREATE INDEX "Product_tenantId_brand_idx" ON "Product"("tenantId", "brand");

-- CreateIndex
CREATE INDEX "Product_tenantId_category_idx" ON "Product"("tenantId", "category");

-- AddForeignKey
ALTER TABLE "ProductUnit" ADD CONSTRAINT "ProductUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
