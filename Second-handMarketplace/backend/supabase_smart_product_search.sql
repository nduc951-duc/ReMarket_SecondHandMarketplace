-- Accent-insensitive fuzzy suggestions used after exact full-text search has no result.

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.f_unaccent(value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent', COALESCE(value, ''))
$$;

CREATE INDEX IF NOT EXISTS idx_products_title_trgm
  ON public.products USING GIN (public.f_unaccent(LOWER(title)) gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.smart_product_suggestions(
  query_text TEXT,
  max_results INTEGER DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  price NUMERIC,
  match_score REAL
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  WITH normalized AS (
    SELECT public.f_unaccent(LOWER(BTRIM(query_text))) AS query
  )
  SELECT
    product.id,
    product.title,
    product.category::TEXT,
    product.price,
    GREATEST(
      similarity(public.f_unaccent(LOWER(product.title)), normalized.query),
      word_similarity(normalized.query, public.f_unaccent(LOWER(product.title)))
    )::REAL AS match_score
  FROM public.products AS product
  CROSS JOIN normalized
  WHERE product.status::TEXT = 'active'
    AND normalized.query <> ''
    AND (
      public.f_unaccent(LOWER(product.title)) % normalized.query
      OR word_similarity(normalized.query, public.f_unaccent(LOWER(product.title))) >= 0.2
    )
  ORDER BY match_score DESC, product.created_at DESC
  LIMIT LEAST(GREATEST(max_results, 1), 20)
$$;

GRANT EXECUTE ON FUNCTION public.smart_product_suggestions(TEXT, INTEGER)
  TO anon, authenticated, service_role;
