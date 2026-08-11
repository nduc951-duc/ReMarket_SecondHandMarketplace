-- Persist outbound payment metadata so status queries survive API restarts.
-- Apply after supabase_payment_lifecycle.sql.

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  transaction_id UUID PRIMARY KEY REFERENCES public.transactions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('momo', 'vnpay')),
  request_id TEXT,
  amount DECIMAL(12,2) CHECK (amount IS NULL OR amount > 0),
  order_info TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  payment_url TEXT,
  gateway_response JSONB NOT NULL DEFAULT '{}'::JSONB,
  gateway_transaction_id TEXT,
  response_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_provider_transaction
  ON public.payment_attempts(provider, gateway_transaction_id)
  WHERE gateway_transaction_id IS NOT NULL AND gateway_transaction_id <> '';

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_attempts FROM anon, authenticated;
GRANT ALL ON TABLE public.payment_attempts TO service_role;

NOTIFY pgrst, 'reload schema';
