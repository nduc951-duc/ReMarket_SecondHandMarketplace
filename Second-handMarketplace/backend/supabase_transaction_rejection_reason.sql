-- Backfill a transaction column used by cancellation and payment flows.
-- Safe to run on both legacy and newly provisioned ReMarket databases.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';

UPDATE public.transactions
  SET rejection_reason = ''
  WHERE rejection_reason IS NULL;

ALTER TABLE public.transactions
  ALTER COLUMN rejection_reason SET DEFAULT '';

NOTIFY pgrst, 'reload schema';
