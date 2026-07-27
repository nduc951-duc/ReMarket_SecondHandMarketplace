-- ============================================================
-- ReMarket: database constraints and browser access hardening
-- Apply after:
--   1. supabase_migration_fixed.sql
--   2. supabase_transaction_invariants.sql
--   3. supabase_payment_idempotency.sql
--   4. supabase_realtime_chat.sql
--
-- This migration deliberately refuses to hide invalid historical data.
-- Resolve any exception it reports, then run the migration again.
-- ============================================================

DO $$
DECLARE
  violation_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM public.products
  WHERE price IS NULL OR price <= 0;

  IF violation_count > 0 THEN
    RAISE EXCEPTION
      'database hardening blocked: % product(s) have a non-positive price',
      violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM public.transactions
  WHERE buyer_id IS NOT NULL
    AND seller_id IS NOT NULL
    AND buyer_id = seller_id;

  IF violation_count > 0 THEN
    RAISE EXCEPTION
      'database hardening blocked: % transaction(s) have the same buyer and seller',
      violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM public.reviews
  WHERE rating NOT BETWEEN 1 AND 5
    OR reviewer_id = reviewed_user_id;

  IF violation_count > 0 THEN
    RAISE EXCEPTION
      'database hardening blocked: % review(s) have an invalid rating or self-review',
      violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM public.product_reviews
  WHERE rating NOT BETWEEN 1 AND 5;

  IF violation_count > 0 THEN
    RAISE EXCEPTION
      'database hardening blocked: % product review(s) have an invalid rating',
      violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM (
    SELECT user_id, product_id
    FROM public.wishlists
    GROUP BY user_id, product_id
    HAVING COUNT(*) > 1
  ) duplicate_wishlists;

  IF violation_count > 0 THEN
    RAISE EXCEPTION
      'database hardening blocked: % duplicate wishlist pair(s) exist',
      violation_count;
  END IF;

  SELECT COUNT(*) INTO violation_count
  FROM (
    SELECT transaction_id, reviewer_id
    FROM public.reviews
    GROUP BY transaction_id, reviewer_id
    HAVING COUNT(*) > 1
  ) duplicate_reviews;

  IF violation_count > 0 THEN
    RAISE EXCEPTION
      'database hardening blocked: % duplicate transaction/reviewer pair(s) exist',
      violation_count;
  END IF;
END
$$;

ALTER TABLE public.products
  ALTER COLUMN price DROP DEFAULT;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_price_positive;
ALTER TABLE public.products
  ADD CONSTRAINT products_price_positive
  CHECK (price > 0);

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_buyer_seller_different;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_buyer_seller_different
  CHECK (buyer_id <> seller_id);

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_rating_range;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_rating_range
  CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_no_self_review;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_no_self_review
  CHECK (reviewer_id <> reviewed_user_id);

ALTER TABLE public.product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_rating_range;
ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_rating_range
  CHECK (rating BETWEEN 1 AND 5);

CREATE UNIQUE INDEX IF NOT EXISTS ux_wishlists_user_product
  ON public.wishlists (user_id, product_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_reviews_transaction_reviewer
  ON public.reviews (transaction_id, reviewer_id);

-- RLS is enabled explicitly on every application table in the public schema.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_callback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_status_audit_log ENABLE ROW LEVEL SECURITY;

-- `categories` is optional in older installs; the API falls back to distinct
-- product categories when the table is absent.
DO $$
BEGIN
  IF to_regclass('public.categories') IS NOT NULL THEN
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
    REVOKE ALL PRIVILEGES ON TABLE public.categories FROM anon, authenticated;
    GRANT SELECT ON TABLE public.categories TO anon, authenticated;
    GRANT ALL PRIVILEGES ON TABLE public.categories TO service_role;
  END IF;
END
$$;

-- All business mutations go through authenticated Express endpoints. The
-- service-role client derives actor identity from the verified access token.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own participant row"
  ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can insert own participant row"
  ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can insert own messages" ON public.chat_messages;

DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert product reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Anyone can insert product views" ON public.product_views;

DROP POLICY IF EXISTS "Users can insert own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users can delete own wishlist" ON public.wishlists;

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

REVOKE ALL PRIVILEGES ON TABLE
  public.profiles,
  public.transactions,
  public.products,
  public.conversations,
  public.conversation_participants,
  public.chat_messages,
  public.reviews,
  public.product_reviews,
  public.product_views,
  public.wishlists,
  public.notifications,
  public.payment_callback_events,
  public.transaction_status_audit_log
FROM anon, authenticated;

-- Browser reads that are part of the public/realtime contract. RLS still
-- decides which rows each role can see.
GRANT SELECT ON TABLE
  public.products,
  public.reviews,
  public.product_reviews
TO anon, authenticated;

GRANT SELECT ON TABLE
  public.profiles,
  public.transactions,
  public.conversations,
  public.conversation_participants,
  public.chat_messages,
  public.notifications
TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  public.profiles,
  public.transactions,
  public.products,
  public.conversations,
  public.conversation_participants,
  public.chat_messages,
  public.reviews,
  public.product_reviews,
  public.product_views,
  public.wishlists,
  public.notifications,
  public.payment_callback_events,
  public.transaction_status_audit_log
TO service_role;

-- Trigger-only SECURITY DEFINER functions must not be callable as public RPCs.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_profile_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_product_rating() FROM PUBLIC, anon, authenticated;

-- Product view increments are performed by the backend service role.
REVOKE ALL ON FUNCTION public.increment_product_view_count(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_view_count(UUID)
  TO service_role;

ALTER FUNCTION public.handle_new_user()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.refresh_profile_rating()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.refresh_product_rating()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_product_view_count(UUID)
  SET search_path = public, pg_temp;
