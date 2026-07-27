-- Enforce marketplace and gateway invariants at the database boundary.
-- This migration intentionally fails when historical duplicates exist so they
-- can be reviewed instead of being deleted automatically.

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_one_open_order_per_product
  ON public.transactions (product_id)
  WHERE status IN ('awaiting_payment', 'pending', 'confirmed');

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_gateway_transaction_id
  ON public.transactions (payment_gateway_transaction_id)
  WHERE payment_gateway_transaction_id IS NOT NULL
    AND payment_gateway_transaction_id <> '';
