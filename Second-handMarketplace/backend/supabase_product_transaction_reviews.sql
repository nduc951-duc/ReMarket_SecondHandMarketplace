-- Canonical product comments backed by completed marketplace transactions.
-- Safe to apply after the base migration; it does not delete legacy product_reviews rows.

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- Backfill legacy reviews from the trusted transaction instead of relying on
-- product identifiers previously supplied by a client.
UPDATE public.reviews AS review
SET
  product_id = marketplace_transaction.product_id,
  reviewed_user_id = marketplace_transaction.seller_id
FROM public.transactions AS marketplace_transaction
WHERE review.transaction_id = marketplace_transaction.id
  AND (
    review.product_id IS DISTINCT FROM marketplace_transaction.product_id
    OR review.reviewed_user_id IS DISTINCT FROM marketplace_transaction.seller_id
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_reviews_transaction_reviewer
  ON public.reviews (transaction_id, reviewer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product_created
  ON public.reviews (product_id, created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role full access on reviews" ON public.reviews;
CREATE POLICY "Service role full access on reviews"
  ON public.reviews FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.reviews FROM anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.reviews TO service_role;

CREATE OR REPLACE FUNCTION public.sync_review_with_completed_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  marketplace_transaction public.transactions%ROWTYPE;
BEGIN
  SELECT *
  INTO marketplace_transaction
  FROM public.transactions
  WHERE id = NEW.transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review transaction does not exist'
      USING ERRCODE = '23503';
  END IF;

  IF marketplace_transaction.status::TEXT <> 'completed' THEN
    RAISE EXCEPTION 'Only completed transactions can be reviewed'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.reviewer_id IS DISTINCT FROM marketplace_transaction.buyer_id THEN
    RAISE EXCEPTION 'Only the transaction buyer can review the product'
      USING ERRCODE = '42501';
  END IF;

  NEW.product_id := marketplace_transaction.product_id;
  NEW.reviewed_user_id := marketplace_transaction.seller_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_review_with_completed_transaction() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_reviews_sync_completed_transaction ON public.reviews;
CREATE TRIGGER trg_reviews_sync_completed_transaction
  BEFORE INSERT OR UPDATE OF transaction_id, reviewer_id, product_id, reviewed_user_id
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_review_with_completed_transaction();

CREATE OR REPLACE FUNCTION public.refresh_transaction_review_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_product UUID := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  IF target_product IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.products AS product
  SET
    avg_rating = summary.avg_rating,
    rating_count = summary.rating_count,
    comment_count = summary.comment_count,
    updated_at = NOW()
  FROM (
    SELECT
      COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0) AS avg_rating,
      COUNT(*)::INTEGER AS rating_count,
      COUNT(*) FILTER (WHERE NULLIF(BTRIM(comment), '') IS NOT NULL)::INTEGER AS comment_count
    FROM public.reviews
    WHERE product_id = target_product
  ) AS summary
  WHERE product.id = target_product;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_transaction_review_product_rating() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_transaction_reviews_refresh_product_rating ON public.reviews;
CREATE TRIGGER trg_transaction_reviews_refresh_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_transaction_review_product_rating();
