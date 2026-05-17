-- Payment lifecycle for online gateways (MoMo/VNPAY).
-- Run this in Supabase SQL Editor before using online payment.

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_status_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_status_check
  CHECK (status IN (
    'awaiting_payment',
    'pending',
    'confirmed',
    'shipped',
    'completed',
    'cancelled'
  ));

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_gateway_transaction_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_response_code TEXT DEFAULT '';

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_payment_status_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_payment_status_check
  CHECK (payment_status IN (
    'unpaid',
    'pending',
    'paid',
    'failed',
    'expired',
    'cod'
  ));

CREATE INDEX IF NOT EXISTS idx_transactions_payment_status
  ON public.transactions(payment_status);

CREATE INDEX IF NOT EXISTS idx_transactions_payment_expires_at
  ON public.transactions(payment_expires_at);
