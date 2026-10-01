-- CreateTable
CREATE TABLE "MedicineCatalog" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "strength" TEXT,
    "dosage" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "company" TEXT NOT NULL,

    CONSTRAINT "MedicineCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicineCatalog_brand_idx" ON "MedicineCatalog"("brand");

-- CreateIndex
CREATE INDEX "MedicineCatalog_genericName_idx" ON "MedicineCatalog"("genericName");
