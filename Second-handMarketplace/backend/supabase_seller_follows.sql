-- Follow sellers and deliver price-change notifications through the backend.

CREATE TABLE IF NOT EXISTS public.seller_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, seller_id),
  CONSTRAINT seller_follows_no_self_follow CHECK (follower_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_follows_seller
  ON public.seller_follows (seller_id, created_at DESC);

ALTER TABLE public.seller_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Followers can read own follows" ON public.seller_follows;
CREATE POLICY "Followers can read own follows"
  ON public.seller_follows FOR SELECT
  TO authenticated
  USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Service role manages seller follows" ON public.seller_follows;
CREATE POLICY "Service role manages seller follows"
  ON public.seller_follows FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.seller_follows FROM anon, authenticated;
GRANT SELECT ON public.seller_follows TO authenticated;
GRANT ALL PRIVILEGES ON public.seller_follows TO service_role;
