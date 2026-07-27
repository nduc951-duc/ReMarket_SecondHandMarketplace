-- Atomic, replay-safe payment callback processing for MoMo and VNPAY.
-- Apply after supabase_payment_lifecycle.sql and supabase_transaction_invariants.sql.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_currency TEXT NOT NULL DEFAULT 'VND',
  ADD COLUMN IF NOT EXISTS payment_idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_payment_idempotency_key
  ON public.transactions (payment_idempotency_key)
  WHERE payment_idempotency_key IS NOT NULL
    AND payment_idempotency_key <> '';

-- The gateway transaction identifier is the provider_transaction_id described
-- by the payment flow. Keep the existing column for API compatibility.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_gateway_transaction_id
  ON public.transactions (payment_gateway_transaction_id)
  WHERE payment_gateway_transaction_id IS NOT NULL
    AND payment_gateway_transaction_id <> '';

CREATE TABLE IF NOT EXISTS public.payment_callback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID,
  provider TEXT NOT NULL CHECK (provider IN ('momo', 'vnpay')),
  provider_transaction_id TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL UNIQUE,
  event_status TEXT NOT NULL CHECK (event_status IN ('success', 'failed')),
  amount DECIMAL(12,2),
  currency TEXT NOT NULL DEFAULT 'VND',
  response_code TEXT NOT NULL DEFAULT '',
  sanitized_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'rejected')),
  outcome TEXT NOT NULL DEFAULT 'received',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_callback_events_transaction
  ON public.payment_callback_events(transaction_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_callback_events_provider_transaction
  ON public.payment_callback_events(provider, provider_transaction_id)
  WHERE provider_transaction_id <> '';

CREATE TABLE IF NOT EXISTS public.transaction_status_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  callback_event_id UUID REFERENCES public.payment_callback_events(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  old_status TEXT,
  new_status TEXT,
  old_payment_status TEXT,
  new_payment_status TEXT,
  reason TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_status_audit_transaction
  ON public.transaction_status_audit_log(transaction_id, created_at DESC);

ALTER TABLE public.payment_callback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_status_audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.process_payment_callback(
  p_provider TEXT,
  p_transaction_id UUID,
  p_provider_transaction_id TEXT,
  p_idempotency_key TEXT,
  p_event_status TEXT,
  p_response_code TEXT,
  p_amount DECIMAL,
  p_currency TEXT,
  p_sanitized_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.payment_callback_events%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
  v_conflicting_transaction_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_outcome TEXT;
BEGIN
  IF p_provider NOT IN ('momo', 'vnpay')
    OR p_event_status NOT IN ('success', 'failed')
    OR COALESCE(TRIM(p_idempotency_key), '') = '' THEN
    RAISE EXCEPTION 'Invalid payment callback arguments';
  END IF;

  INSERT INTO public.payment_callback_events (
    transaction_id,
    provider,
    provider_transaction_id,
    idempotency_key,
    event_status,
    amount,
    currency,
    response_code,
    sanitized_payload
  )
  VALUES (
    p_transaction_id,
    LOWER(p_provider),
    COALESCE(TRIM(p_provider_transaction_id), ''),
    p_idempotency_key,
    p_event_status,
    p_amount,
    UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'VND')),
    COALESCE(p_response_code, ''),
    COALESCE(p_sanitized_payload, '{}'::JSONB)
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING * INTO v_event;

  IF v_event.id IS NULL THEN
    SELECT *
      INTO v_event
      FROM public.payment_callback_events
      WHERE idempotency_key = p_idempotency_key;

    RETURN JSONB_BUILD_OBJECT(
      'processed', FALSE,
      'replayed', TRUE,
      'outcome', v_event.outcome,
      'eventId', v_event.id
    );
  END IF;

  SELECT *
    INTO v_transaction
    FROM public.transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

  IF v_transaction.id IS NULL THEN
    v_outcome := 'transaction_not_found';
  ELSIF COALESCE(v_transaction.payment_method, '') <> LOWER(p_provider) THEN
    v_outcome := 'provider_mismatch';
  ELSIF p_amount IS NULL OR p_amount <> v_transaction.amount THEN
    v_outcome := 'amount_mismatch';
  ELSIF UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'VND'))
    <> UPPER(COALESCE(NULLIF(TRIM(v_transaction.payment_currency), ''), 'VND')) THEN
    v_outcome := 'currency_mismatch';
  ELSIF v_transaction.payment_status = 'paid' THEN
    v_outcome := 'invalid_state';
  ELSIF v_transaction.status <> 'awaiting_payment'
    OR v_transaction.payment_status <> 'pending' THEN
    v_outcome := 'invalid_state';
  ELSIF v_transaction.payment_expires_at IS NOT NULL
    AND v_transaction.payment_expires_at < v_now THEN
    v_outcome := 'expired';
  ELSIF p_event_status = 'success'
    AND COALESCE(TRIM(p_provider_transaction_id), '') = '' THEN
    v_outcome := 'missing_provider_transaction_id';
  ELSE
    IF COALESCE(TRIM(p_provider_transaction_id), '') <> '' THEN
      SELECT id
        INTO v_conflicting_transaction_id
        FROM public.transactions
        WHERE payment_gateway_transaction_id = TRIM(p_provider_transaction_id)
          AND id <> p_transaction_id
        LIMIT 1;
    END IF;

    IF v_conflicting_transaction_id IS NOT NULL THEN
      v_outcome := 'provider_transaction_conflict';
    ELSIF p_event_status = 'success' THEN
      BEGIN
        UPDATE public.transactions
          SET status = 'pending',
              payment_status = 'paid',
              paid_at = v_now,
              payment_failed_at = NULL,
              payment_gateway_transaction_id = TRIM(p_provider_transaction_id),
              payment_response_code = COALESCE(p_response_code, ''),
              payment_currency = UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'VND')),
              payment_idempotency_key = p_idempotency_key,
              rejection_reason = '',
              updated_at = v_now
          WHERE id = p_transaction_id
            AND status = 'awaiting_payment'
            AND payment_status = 'pending'
          RETURNING * INTO v_transaction;

        v_outcome := CASE WHEN v_transaction.id IS NULL THEN 'invalid_state' ELSE 'processed' END;
      EXCEPTION WHEN unique_violation THEN
        v_outcome := 'provider_transaction_conflict';
      END;
    ELSE
      BEGIN
        UPDATE public.transactions
          SET status = 'cancelled',
              payment_status = 'failed',
              payment_failed_at = v_now,
              cancelled_at = v_now,
              payment_gateway_transaction_id = COALESCE(TRIM(p_provider_transaction_id), ''),
              payment_response_code = COALESCE(p_response_code, ''),
              payment_currency = UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'VND')),
              payment_idempotency_key = p_idempotency_key,
              rejection_reason = 'Thanh toan khong thanh cong.',
              updated_at = v_now
          WHERE id = p_transaction_id
            AND status = 'awaiting_payment'
            AND payment_status = 'pending'
          RETURNING * INTO v_transaction;

        v_outcome := CASE WHEN v_transaction.id IS NULL THEN 'invalid_state' ELSE 'processed' END;
      EXCEPTION WHEN unique_violation THEN
        v_outcome := 'provider_transaction_conflict';
      END;
    END IF;
  END IF;

  UPDATE public.payment_callback_events
    SET processing_status = CASE WHEN v_outcome = 'processed' THEN 'processed' ELSE 'rejected' END,
        outcome = v_outcome,
        processed_at = v_now
    WHERE id = v_event.id;

  IF v_outcome = 'processed' THEN
    INSERT INTO public.transaction_status_audit_log (
      transaction_id,
      callback_event_id,
      actor_type,
      actor_id,
      old_status,
      new_status,
      old_payment_status,
      new_payment_status,
      reason,
      metadata
    )
    VALUES (
      p_transaction_id,
      v_event.id,
      'payment_gateway',
      LOWER(p_provider),
      'awaiting_payment',
      v_transaction.status,
      'pending',
      v_transaction.payment_status,
      'Verified payment callback',
      JSONB_BUILD_OBJECT(
        'providerTransactionId', COALESCE(p_provider_transaction_id, ''),
        'responseCode', COALESCE(p_response_code, ''),
        'amount', p_amount,
        'currency', UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'VND')),
        'idempotencyKey', p_idempotency_key
      )
    );
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'processed', v_outcome = 'processed',
    'replayed', FALSE,
    'outcome', v_outcome,
    'eventId', v_event.id,
    'transaction', CASE
      WHEN v_transaction.id IS NULL THEN NULL
      ELSE TO_JSONB(v_transaction)
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_payment_callback(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_payment_callback(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, JSONB
) TO service_role;
