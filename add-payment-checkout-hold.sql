-- Paystack + payment columns (idempotent-style helpers for Supabase / psql).
-- Prefer `npx prisma db push` if you use Prisma. Use this if you apply SQL by hand.

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('AWAITING_PAYMENT', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paystackReference" TEXT;

-- Legacy rename if upgrading from the Stripe field name:
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'stripeCheckoutSessionId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'paystackReference'
  ) THEN
    ALTER TABLE "Order" RENAME COLUMN "stripeCheckoutSessionId" TO "paystackReference";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_paystackReference_key" ON "Order"("paystackReference");

CREATE TABLE IF NOT EXISTS "CheckoutSessionHold" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "paystackReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CheckoutSessionHold_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CheckoutSessionHold' AND column_name = 'stripeSessionId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CheckoutSessionHold' AND column_name = 'paystackReference'
  ) THEN
    ALTER TABLE "CheckoutSessionHold" RENAME COLUMN "stripeSessionId" TO "paystackReference";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "CheckoutSessionHold_idempotencyKey_key" ON "CheckoutSessionHold"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "CheckoutSessionHold_paystackReference_key" ON "CheckoutSessionHold"("paystackReference");
CREATE INDEX IF NOT EXISTS "CheckoutSessionHold_expiresAt_idx" ON "CheckoutSessionHold"("expiresAt");
