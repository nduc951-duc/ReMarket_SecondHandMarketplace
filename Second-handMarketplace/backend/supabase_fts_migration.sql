-- 1. Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Create immutable unaccent wrapper (required for generated columns)
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- 3. Add tsvector column (generated/stored for performance)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', f_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(category, ''))), 'B') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(description, ''))), 'C') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(location, ''))), 'D')
  ) STORED;

-- 4. GIN index for fast FTS queries
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON public.products USING GIN (search_vector);

-- 5. Drop existing functions first to avoid signature conflicts
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_sig 
        FROM pg_proc 
        WHERE proname IN ('search_products', 'autocomplete_products')
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

-- 6. Search function (called via Supabase RPC)
CREATE OR REPLACE FUNCTION public.search_products(
  search_query TEXT,
  filter_categories TEXT[] DEFAULT NULL,
  filter_conditions TEXT[] DEFAULT NULL,
  filter_min_price NUMERIC DEFAULT NULL,
  filter_max_price NUMERIC DEFAULT NULL,
  filter_city TEXT DEFAULT NULL,
  filter_district TEXT DEFAULT NULL,
  filter_posted_within INTEGER DEFAULT NULL,
  filter_has_images BOOLEAN DEFAULT FALSE,
  filter_verified_seller BOOLEAN DEFAULT FALSE,
  filter_in_stock BOOLEAN DEFAULT TRUE,
  filter_negotiable BOOLEAN DEFAULT FALSE,
  filter_seller_id UUID DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  page_offset INTEGER DEFAULT 0,
  page_limit INTEGER DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  seller_id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  category TEXT,
  condition TEXT,
  images TEXT[],
  location TEXT,
  status TEXT,
  view_count INTEGER,
  comment_count INTEGER,
  avg_rating NUMERIC,
  rating_count INTEGER,
  is_negotiable BOOLEAN,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  relevance_score REAL,
  total_count BIGINT
) AS $$
DECLARE
  ts_query tsquery;
  start_time TIMESTAMPTZ := NULL;
  seller_ids UUID[] := NULL;
BEGIN
  -- Build tsquery with prefix matching and unaccent
  IF search_query IS NOT NULL AND search_query <> '' THEN
    ts_query := websearch_to_tsquery('simple', f_unaccent(search_query));
  END IF;

  -- Calculate start time for posted_within filter
  IF filter_posted_within IS NOT NULL AND filter_posted_within > 0 THEN
    start_time := NOW() - (filter_posted_within || ' days')::INTERVAL;
  ELSIF filter_posted_within = 0 THEN
    -- Today
    start_time := date_trunc('day', NOW());
  END IF;

  -- Get verified sellers if required
  IF filter_verified_seller THEN
    SELECT array_agg(p.id) INTO seller_ids FROM public.profiles p WHERE p.verified = TRUE;
    IF seller_ids IS NULL THEN
      -- Return empty if no verified sellers exist
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    p.id::UUID, p.seller_id::UUID, p.title::TEXT, p.description::TEXT,
    p.price::NUMERIC, p.category::TEXT, p.condition::TEXT, p.images::TEXT[],
    p.location::TEXT, p.status::TEXT, p.view_count::INTEGER, p.comment_count::INTEGER,
    p.avg_rating::NUMERIC, p.rating_count::INTEGER, p.is_negotiable::BOOLEAN, p.sold_at::TIMESTAMPTZ,
    p.created_at::TIMESTAMPTZ, p.updated_at::TIMESTAMPTZ,
    (CASE WHEN ts_query IS NOT NULL THEN ts_rank_cd(p.search_vector, ts_query) ELSE 0 END)::REAL AS relevance_score,
    COUNT(*) OVER()::BIGINT AS total_count
  FROM public.products p
  WHERE
    (
      (filter_in_stock AND p.status::text = 'active') OR 
      (NOT filter_in_stock AND p.status::text IN ('active', 'sold'))
    )
    AND (ts_query IS NULL OR ts_query::text = '' OR p.search_vector @@ ts_query)
    AND (filter_categories IS NULL OR p.category::text = ANY(filter_categories))
    AND (filter_conditions IS NULL OR p.condition::text = ANY(filter_conditions))
    AND (filter_min_price IS NULL OR p.price >= filter_min_price)
    AND (filter_max_price IS NULL OR p.price <= filter_max_price)
    AND (filter_city IS NULL OR filter_city = '' OR p.location ILIKE '%' || filter_city || '%')
    AND (filter_district IS NULL OR filter_district = '' OR p.location ILIKE '%' || filter_district || '%')
    AND (start_time IS NULL OR p.created_at >= start_time)
    AND (NOT filter_has_images OR (p.images IS NOT NULL AND array_length(p.images, 1) > 0))
    AND (NOT filter_verified_seller OR p.seller_id = ANY(seller_ids))
    AND (NOT filter_negotiable OR p.is_negotiable = TRUE)
    AND (filter_seller_id IS NULL OR p.seller_id = filter_seller_id)
  ORDER BY
    CASE WHEN sort_by = 'relevance' AND ts_query IS NOT NULL THEN ts_rank_cd(p.search_vector, ts_query) END DESC NULLS LAST,
    CASE WHEN sort_by = 'newest' THEN p.created_at END DESC,
    CASE WHEN sort_by = 'oldest' THEN p.created_at END ASC,
    CASE WHEN sort_by = 'price_asc' THEN p.price END ASC,
    CASE WHEN sort_by = 'price_desc' THEN p.price END DESC,
    CASE WHEN sort_by = 'view_desc' THEN p.view_count END DESC,
    CASE WHEN sort_by = 'comment_desc' THEN p.comment_count END DESC,
    CASE WHEN sort_by = 'rating_desc' THEN p.avg_rating END DESC,
    p.created_at DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. Autocomplete function (lightweight, returns titles only)
CREATE OR REPLACE FUNCTION public.autocomplete_products(
  query_text TEXT,
  max_results INTEGER DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  price NUMERIC
) AS $$
DECLARE
  ts_query tsquery;
BEGIN
  IF query_text IS NULL OR trim(query_text) = '' THEN
    RETURN;
  END IF;

  ts_query := websearch_to_tsquery('simple', f_unaccent(query_text));
  IF ts_query::text != '' THEN
    ts_query := (ts_query::text || ':*')::tsquery;
  END IF;

  RETURN QUERY
  SELECT p.id::UUID, p.title::TEXT, p.category::TEXT, p.price::NUMERIC
  FROM public.products p
  WHERE
    p.status::text = 'active'
    AND (ts_query IS NULL OR ts_query::text = '' OR p.search_vector @@ ts_query)
  ORDER BY ts_rank_cd(p.search_vector, ts_query) DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;
