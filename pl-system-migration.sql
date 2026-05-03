-- P&L System Migration SQL
-- Run this directly in Supabase SQL Editor or via psql
-- This adds all the tables and fields needed for the P&L system

-- Add discount and return tracking to OrderItem table
ALTER TABLE "OrderItem" 
ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION DEFAULT 0;

-- Add discount and return tracking to Order table
ALTER TABLE "Order" 
ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "isReturn" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "returnReason" TEXT;

-- Create ExpenseCategory enum
DO $$ BEGIN
    CREATE TYPE "ExpenseCategory" AS ENUM (
        'RENT',
        'ELECTRICITY',
        'TRANSPORT',
        'SOUVENIR',
        'MARKETING',
        'SALARIES',
        'UTILITIES',
        'MAINTENANCE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Expense table
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create AssetType enum
DO $$ BEGIN
    CREATE TYPE "AssetType" AS ENUM (
        'INVENTORY',
        'BANK_ACCOUNT',
        'LEASE_PROPERTY',
        'LEASE_ASSETS',
        'OTHER_FIXED',
        'OTHER_CURRENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Asset table
CREATE TABLE IF NOT EXISTS "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" "AssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create LiabilityType enum
DO $$ BEGIN
    CREATE TYPE "LiabilityType" AS ENUM (
        'ACCOUNTS_PAYABLE',
        'LOANS',
        'LEASE_LIABILITIES',
        'TAXES_PAYABLE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Liability table
CREATE TABLE IF NOT EXISTS "Liability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" "LiabilityType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "Expense_category_idx" ON "Expense"("category");
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");
CREATE INDEX IF NOT EXISTS "Asset_type_idx" ON "Asset"("type");
CREATE INDEX IF NOT EXISTS "Liability_type_idx" ON "Liability"("type");
CREATE INDEX IF NOT EXISTS "Order_isReturn_idx" ON "Order"("isReturn");

-- Add comments for documentation
COMMENT ON TABLE "Expense" IS 'Business expenses for P&L tracking';
COMMENT ON TABLE "Asset" IS 'Balance sheet assets';
COMMENT ON TABLE "Liability" IS 'Balance sheet liabilities';
COMMENT ON COLUMN "Order"."discountAmount" IS 'Total discount applied to order';
COMMENT ON COLUMN "Order"."isReturn" IS 'Whether this order is a return/refund';
COMMENT ON COLUMN "OrderItem"."discount" IS 'Discount amount for this item';

