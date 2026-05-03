-- Run in Supabase SQL editor (or psql) if you deploy without `prisma db push`.
-- Safe to run once when upgrading an existing database.

CREATE TYPE "PaymentStatus" AS ENUM ('AWAITING_PAYMENT', 'PAID', 'FAILED', 'REFUNDED');

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripeCheckoutSessionId_key" ON "Order"("stripeCheckoutSessionId");

CREATE TABLE IF NOT EXISTS "CheckoutSessionHold" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CheckoutSessionHold_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CheckoutSessionHold_idempotencyKey_key" ON "CheckoutSessionHold"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "CheckoutSessionHold_stripeSessionId_key" ON "CheckoutSessionHold"("stripeSessionId");
CREATE INDEX IF NOT EXISTS "CheckoutSessionHold_expiresAt_idx" ON "CheckoutSessionHold"("expiresAt");
