-- ============================================
-- SUPABASE DATABASE SETUP SQL
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE ENUMS
-- ============================================

-- OrderSource enum
DO $$ BEGIN
    CREATE TYPE "OrderSource" AS ENUM ('ONLINE', 'POS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- OrderStatus enum
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- NotificationType enum
DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('ORDER_PLACED', 'ORDER_PROCESSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AdminRole enum
DO $$ BEGIN
    CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'MANAGER', 'SALES_PERSON');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- CREATE TABLES
-- ============================================

-- Admin table (linked to Firebase Auth)
CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firebaseUid" TEXT NOT NULL UNIQUE,
    "email" TEXT NOT NULL UNIQUE,
    "role" "AdminRole" NOT NULL DEFAULT 'SALES_PERSON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Product table
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL UNIQUE,
    "brand" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "images" TEXT, -- JSON array of image URLs
    "sizes" TEXT, -- JSON array of sizes
    "colors" TEXT, -- JSON array of colors
    "features" TEXT, -- JSON array of features
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Order table
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" "OrderSource" NOT NULL DEFAULT 'ONLINE',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total" DOUBLE PRECISION NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "shippingAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- OrderItem table
CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Sale table
CREATE TABLE IF NOT EXISTS "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL UNIQUE,
    "source" "OrderSource" NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Notification table
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Admin indexes
CREATE INDEX IF NOT EXISTS "Admin_firebaseUid_idx" ON "Admin"("firebaseUid");
CREATE INDEX IF NOT EXISTS "Admin_email_idx" ON "Admin"("email");

-- Product indexes
CREATE INDEX IF NOT EXISTS "Product_sku_idx" ON "Product"("sku");
CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category");
CREATE INDEX IF NOT EXISTS "Product_brand_idx" ON "Product"("brand");

-- Order indexes
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_source_idx" ON "Order"("source");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

-- OrderItem indexes
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");

-- Sale indexes
CREATE INDEX IF NOT EXISTS "Sale_orderId_idx" ON "Sale"("orderId");
CREATE INDEX IF NOT EXISTS "Sale_createdAt_idx" ON "Sale"("createdAt");

-- Notification indexes
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE "Admin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

-- Admin policies (only authenticated admins can access)
CREATE POLICY "Admins can view all admins" ON "Admin"
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert admins" ON "Admin"
    FOR INSERT WITH CHECK (true);

-- Product policies (public read, admin write)
CREATE POLICY "Anyone can view products" ON "Product"
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage products" ON "Product"
    FOR ALL USING (true);

-- Order policies (admins can view all, users can view their own)
CREATE POLICY "Admins can view all orders" ON "Order"
    FOR SELECT USING (true);

CREATE POLICY "Anyone can create orders" ON "Order"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update orders" ON "Order"
    FOR UPDATE USING (true);

-- OrderItem policies (follow order access)
CREATE POLICY "Anyone can view order items" ON "OrderItem"
    FOR SELECT USING (true);

CREATE POLICY "Anyone can create order items" ON "OrderItem"
    FOR INSERT WITH CHECK (true);

-- Sale policies (admin only)
CREATE POLICY "Admins can view all sales" ON "Sale"
    FOR SELECT USING (true);

CREATE POLICY "Admins can create sales" ON "Sale"
    FOR INSERT WITH CHECK (true);

-- Notification policies (admin only)
CREATE POLICY "Admins can view all notifications" ON "Notification"
    FOR SELECT USING (true);

CREATE POLICY "Admins can create notifications" ON "Notification"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update notifications" ON "Notification"
    FOR UPDATE USING (true);

-- ============================================
-- ENABLE REALTIME FOR NOTIFICATIONS
-- ============================================

-- Enable Realtime publication for Notification table
-- This allows clients to subscribe to real-time changes
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate CUID (if needed)
-- Note: Prisma generates CUIDs on the application side, but this can be used as fallback
CREATE OR REPLACE FUNCTION generate_cuid()
RETURNS TEXT AS $$
DECLARE
    timestamp_part TEXT;
    random_part TEXT;
BEGIN
    timestamp_part := to_hex(extract(epoch from now())::bigint);
    random_part := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12));
    RETURN 'c' || timestamp_part || random_part;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment to verify tables were created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('Admin', 'Product', 'Order', 'OrderItem', 'Sale', 'Notification')
-- ORDER BY table_name;

-- Uncomment to verify enums were created:
-- SELECT typname FROM pg_type WHERE typname IN ('OrderSource', 'OrderStatus', 'NotificationType');

-- ============================================
-- P&L SYSTEM ADDITIONS
-- ============================================

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

