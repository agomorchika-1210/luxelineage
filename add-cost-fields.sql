-- Migration: Add cost fields to Product and OrderItem tables
-- Run this in Supabase SQL Editor if Prisma migration fails

-- Add cost column to Product table (defaults to 0 for existing products)
ALTER TABLE "Product" 
ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Add cost column to OrderItem table (defaults to 0 for existing items)
ALTER TABLE "OrderItem" 
ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Update existing products: if cost is 0, you may want to set it manually
-- For now, we'll leave it at 0 and let admins update it through the UI

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'Product' AND column_name IN ('cost', 'price');

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'OrderItem' AND column_name IN ('cost', 'price');

