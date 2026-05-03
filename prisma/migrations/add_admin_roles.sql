-- Migration: Add AdminRole enum and role field to Admin table
-- Run this in Supabase SQL Editor or via Prisma migrate

-- Create AdminRole enum
DO $$ BEGIN
    CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'MANAGER', 'SALES_PERSON');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to Admin table
ALTER TABLE "Admin" 
ADD COLUMN IF NOT EXISTS "role" "AdminRole" NOT NULL DEFAULT 'SALES_PERSON';

-- Update existing admins to ADMIN role (you may want to change this)
-- UPDATE "Admin" SET "role" = 'ADMIN' WHERE "role" = 'SALES_PERSON';

