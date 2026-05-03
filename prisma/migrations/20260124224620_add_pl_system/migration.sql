-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "isReturn" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "returnReason" TEXT;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "ExpenseCategory" AS ENUM('RENT', 'ELECTRICITY', 'TRANSPORT', 'SOUVENIR', 'MARKETING', 'SALARIES', 'UTILITIES', 'MAINTENANCE', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "AssetType" AS ENUM('INVENTORY', 'BANK_ACCOUNT', 'LEASE_PROPERTY', 'LEASE_ASSETS', 'OTHER_FIXED', 'OTHER_CURRENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Asset" (
    "id" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "LiabilityType" AS ENUM('ACCOUNTS_PAYABLE', 'LOANS', 'LEASE_LIABILITIES', 'TAXES_PAYABLE', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Liability" (
    "id" TEXT NOT NULL,
    "type" "LiabilityType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Liability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Liability_type_idx" ON "Liability"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_isReturn_idx" ON "Order"("isReturn");

