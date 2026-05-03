-- Add POS tender / change fields to Order (run after pulling schema change)
-- psql: \i add-pos-tender-fields.sql

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "amountTendered" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "changeGiven" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Order_idempotencyKey_key'
  ) THEN
    CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
  END IF;
END $$;
