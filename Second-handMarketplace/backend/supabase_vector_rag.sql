-- Hybrid vector RAG for ReMarket.
-- Uses backend-only tables and RPCs; browser roles never read embeddings or jobs directly.

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS private;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.f_unaccent(value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent', COALESCE(value, ''))
$$;

CREATE TABLE IF NOT EXISTS public.ai_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'knowledge',
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', public.f_unaccent(content))
  ) STORED,
  embedding extensions.vector(1536),
  embedding_model TEXT,
  embedding_version INTEGER NOT NULL DEFAULT 1,
  embedded_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS public.product_embeddings (
  product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  searchable_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', public.f_unaccent(searchable_text))
  ) STORED,
  embedding extensions.vector(1536),
  embedding_model TEXT,
  embedding_version INTEGER NOT NULL DEFAULT 1,
  embedded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.embedding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('document_chunk', 'product')),
  entity_id UUID NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'stale')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_embedding_jobs_active_entity_hash
  ON public.embedding_jobs (entity_type, entity_id, content_hash)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_embedding_jobs_claim
  ON public.embedding_jobs (status, next_attempt_at, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_search
  ON public.ai_document_chunks USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_product_embeddings_search
  ON public.product_embeddings USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_embedding_hnsw
  ON public.ai_document_chunks
  USING hnsw (embedding extensions.vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_embeddings_embedding_hnsw
  ON public.product_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE OR REPLACE FUNCTION private.enqueue_embedding_job(
  target_type TEXT,
  target_id UUID,
  target_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  INSERT INTO public.embedding_jobs (entity_type, entity_id, content_hash)
  VALUES (target_type, target_id, target_hash)
  ON CONFLICT (entity_type, entity_id, content_hash)
    WHERE status IN ('pending', 'processing')
  DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION private.enqueue_embedding_job(TEXT, UUID, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.queue_document_chunk_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.content IS NOT DISTINCT FROM OLD.content THEN
    NEW.content_hash := OLD.content_hash;
    NEW.embedding := OLD.embedding;
    NEW.embedding_model := OLD.embedding_model;
    NEW.embedding_version := OLD.embedding_version;
    NEW.embedded_at := OLD.embedded_at;
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  NEW.content_hash := MD5(NEW.content);
  NEW.embedding := NULL;
  NEW.embedding_model := NULL;
  NEW.embedded_at := NULL;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.enqueue_document_chunk_after_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.content_hash IS DISTINCT FROM OLD.content_hash THEN
    PERFORM private.enqueue_embedding_job('document_chunk', NEW.id, NEW.content_hash);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_chunks_prepare_embedding ON public.ai_document_chunks;
CREATE TRIGGER trg_ai_chunks_prepare_embedding
  BEFORE INSERT OR UPDATE OF content
  ON public.ai_document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION private.queue_document_chunk_embedding();

DROP TRIGGER IF EXISTS trg_ai_chunks_enqueue_embedding ON public.ai_document_chunks;
CREATE TRIGGER trg_ai_chunks_enqueue_embedding
  AFTER INSERT OR UPDATE OF content
  ON public.ai_document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION private.enqueue_document_chunk_after_write();

CREATE OR REPLACE FUNCTION private.sync_product_embedding_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  source_text TEXT;
  source_hash TEXT;
BEGIN
  source_text := CONCAT_WS(E'\n',
    'Tên: ' || COALESCE(NEW.title, ''),
    'Danh mục: ' || COALESCE(NEW.category::TEXT, ''),
    'Tình trạng: ' || COALESCE(NEW.condition::TEXT, ''),
    'Mô tả: ' || COALESCE(NEW.description, ''),
    'Vị trí: ' || COALESCE(NEW.location, '')
  );
  source_hash := MD5(source_text);

  INSERT INTO public.product_embeddings (
    product_id,
    searchable_text,
    content_hash,
    embedding,
    embedding_model,
    embedded_at,
    updated_at
  )
  VALUES (NEW.id, source_text, source_hash, NULL, NULL, NULL, NOW())
  ON CONFLICT (product_id) DO UPDATE
  SET
    searchable_text = EXCLUDED.searchable_text,
    content_hash = EXCLUDED.content_hash,
    embedding = CASE
      WHEN product_embeddings.content_hash = EXCLUDED.content_hash
        THEN product_embeddings.embedding
      ELSE NULL
    END,
    embedding_model = CASE
      WHEN product_embeddings.content_hash = EXCLUDED.content_hash
        THEN product_embeddings.embedding_model
      ELSE NULL
    END,
    embedded_at = CASE
      WHEN product_embeddings.content_hash = EXCLUDED.content_hash
        THEN product_embeddings.embedded_at
      ELSE NULL
    END,
    updated_at = NOW();

  IF TG_OP = 'INSERT' OR source_hash IS DISTINCT FROM MD5(CONCAT_WS(E'\n',
    'Tên: ' || COALESCE(OLD.title, ''),
    'Danh mục: ' || COALESCE(OLD.category::TEXT, ''),
    'Tình trạng: ' || COALESCE(OLD.condition::TEXT, ''),
    'Mô tả: ' || COALESCE(OLD.description, ''),
    'Vị trí: ' || COALESCE(OLD.location, '')
  )) THEN
    PERFORM private.enqueue_embedding_job('product', NEW.id, source_hash);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_sync_embedding_source ON public.products;
CREATE TRIGGER trg_products_sync_embedding_source
  AFTER INSERT OR UPDATE OF title, category, condition, description, location
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_product_embedding_source();

INSERT INTO public.product_embeddings (product_id, searchable_text, content_hash)
SELECT
  product.id,
  source.searchable_text,
  MD5(source.searchable_text)
FROM public.products AS product
CROSS JOIN LATERAL (
  SELECT CONCAT_WS(E'\n',
    'Tên: ' || COALESCE(product.title, ''),
    'Danh mục: ' || COALESCE(product.category::TEXT, ''),
    'Tình trạng: ' || COALESCE(product.condition::TEXT, ''),
    'Mô tả: ' || COALESCE(product.description, ''),
    'Vị trí: ' || COALESCE(product.location, '')
  ) AS searchable_text
) AS source
ON CONFLICT (product_id) DO UPDATE
SET
  searchable_text = EXCLUDED.searchable_text,
  content_hash = EXCLUDED.content_hash,
  embedding = CASE
    WHEN product_embeddings.content_hash = EXCLUDED.content_hash
      THEN product_embeddings.embedding
    ELSE NULL
  END,
  updated_at = NOW();

INSERT INTO public.embedding_jobs (entity_type, entity_id, content_hash)
SELECT 'product', product_id, content_hash
FROM public.product_embeddings
WHERE embedding IS NULL
ON CONFLICT (entity_type, entity_id, content_hash)
  WHERE status IN ('pending', 'processing')
DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_embedding_jobs(batch_size INTEGER DEFAULT 10)
RETURNS SETOF public.embedding_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.embedding_jobs
  SET
    status = 'pending',
    locked_at = NULL,
    next_attempt_at = NOW(),
    updated_at = NOW()
  WHERE status = 'processing'
    AND locked_at < NOW() - INTERVAL '10 minutes'
    AND attempts < max_attempts;

  RETURN QUERY
  WITH candidates AS (
    SELECT job.id
    FROM public.embedding_jobs AS job
    WHERE job.status = 'pending'
      AND job.next_attempt_at <= NOW()
      AND job.attempts < job.max_attempts
    ORDER BY job.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(batch_size, 1), 50)
  )
  UPDATE public.embedding_jobs AS job
  SET
    status = 'processing',
    attempts = job.attempts + 1,
    locked_at = NOW(),
    updated_at = NOW()
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_embedding_job(
  target_job_id UUID,
  result_embedding extensions.vector(1536),
  result_model TEXT,
  result_version INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_job public.embedding_jobs%ROWTYPE;
  updated_rows INTEGER := 0;
BEGIN
  SELECT *
  INTO target_job
  FROM public.embedding_jobs
  WHERE id = target_job_id
  FOR UPDATE;

  IF NOT FOUND OR target_job.status <> 'processing' THEN
    RETURN 'ignored';
  END IF;

  IF target_job.entity_type = 'document_chunk' THEN
    UPDATE public.ai_document_chunks
    SET
      embedding = result_embedding,
      embedding_model = result_model,
      embedding_version = result_version,
      embedded_at = NOW(),
      updated_at = NOW()
    WHERE id = target_job.entity_id
      AND content_hash = target_job.content_hash;
  ELSE
    UPDATE public.product_embeddings
    SET
      embedding = result_embedding,
      embedding_model = result_model,
      embedding_version = result_version,
      embedded_at = NOW(),
      updated_at = NOW()
    WHERE product_id = target_job.entity_id
      AND content_hash = target_job.content_hash;
  END IF;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  UPDATE public.embedding_jobs
  SET
    status = CASE WHEN updated_rows = 1 THEN 'completed' ELSE 'stale' END,
    completed_at = NOW(),
    locked_at = NULL,
    last_error = NULL,
    updated_at = NOW()
  WHERE id = target_job_id;

  RETURN CASE WHEN updated_rows = 1 THEN 'completed' ELSE 'stale' END;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_embedding_job(
  target_job_id UUID,
  failure_message TEXT,
  retry_delay_seconds INTEGER DEFAULT 30
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_job public.embedding_jobs%ROWTYPE;
  next_status TEXT;
BEGIN
  SELECT *
  INTO target_job
  FROM public.embedding_jobs
  WHERE id = target_job_id
  FOR UPDATE;

  IF NOT FOUND OR target_job.status <> 'processing' THEN
    RETURN 'ignored';
  END IF;

  next_status := CASE
    WHEN target_job.attempts >= target_job.max_attempts THEN 'failed'
    ELSE 'pending'
  END;

  UPDATE public.embedding_jobs
  SET
    status = next_status,
    next_attempt_at = CASE
      WHEN next_status = 'pending'
        THEN NOW() + MAKE_INTERVAL(secs => LEAST(GREATEST(retry_delay_seconds, 5), 3600))
      ELSE next_attempt_at
    END,
    locked_at = NULL,
    last_error = LEFT(COALESCE(failure_message, 'Embedding provider error'), 500),
    updated_at = NOW()
  WHERE id = target_job_id;

  RETURN next_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_embedding_reindex(
  target_model TEXT,
  target_version INTEGER
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  queued_document_chunks BIGINT := 0;
  queued_products BIGINT := 0;
BEGIN
  WITH queued AS (
    INSERT INTO public.embedding_jobs (entity_type, entity_id, content_hash)
    SELECT 'document_chunk', chunk.id, chunk.content_hash
    FROM public.ai_document_chunks AS chunk
    JOIN public.ai_documents AS document ON document.id = chunk.document_id
    WHERE document.active = TRUE
      AND (
        chunk.embedding IS NULL OR
        chunk.embedding_model IS DISTINCT FROM target_model OR
        chunk.embedding_version IS DISTINCT FROM target_version
      )
    ON CONFLICT (entity_type, entity_id, content_hash)
      WHERE status IN ('pending', 'processing')
    DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO queued_document_chunks FROM queued;

  WITH queued AS (
    INSERT INTO public.embedding_jobs (entity_type, entity_id, content_hash)
    SELECT 'product', source.product_id, source.content_hash
    FROM public.product_embeddings AS source
    JOIN public.products AS product ON product.id = source.product_id
    WHERE product.status::TEXT = 'active'
      AND (
        source.embedding IS NULL OR
        source.embedding_model IS DISTINCT FROM target_model OR
        source.embedding_version IS DISTINCT FROM target_version
      )
    ON CONFLICT (entity_type, entity_id, content_hash)
      WHERE status IN ('pending', 'processing')
    DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO queued_products FROM queued;

  RETURN queued_document_chunks + queued_products;
END;
$$;

CREATE OR REPLACE FUNCTION public.hybrid_search_ai_documents(
  query_text TEXT,
  query_embedding extensions.vector(1536),
  match_threshold REAL DEFAULT 0.35,
  match_count INTEGER DEFAULT 6,
  keyword_weight REAL DEFAULT 0.55,
  semantic_weight REAL DEFAULT 0.45,
  rrf_k INTEGER DEFAULT 50
)
RETURNS TABLE (
  chunk_id UUID,
  source_key TEXT,
  title TEXT,
  category TEXT,
  content TEXT,
  metadata JSONB,
  similarity REAL,
  hybrid_score REAL
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH params AS (
    SELECT websearch_to_tsquery('simple', public.f_unaccent(query_text)) AS text_query
  ),
  keyword_ranked AS (
    SELECT
      chunk.id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(chunk.search_vector, params.text_query) DESC
      ) AS rank
    FROM public.ai_document_chunks AS chunk
    JOIN public.ai_documents AS document ON document.id = chunk.document_id
    CROSS JOIN params
    WHERE document.active = TRUE
      AND params.text_query::TEXT <> ''
      AND chunk.search_vector @@ params.text_query
    LIMIT 50
  ),
  semantic_ranked AS (
    SELECT
      chunk.id,
      (1 - (chunk.embedding <=> query_embedding))::REAL AS similarity,
      ROW_NUMBER() OVER (ORDER BY chunk.embedding <=> query_embedding) AS rank
    FROM public.ai_document_chunks AS chunk
    JOIN public.ai_documents AS document ON document.id = chunk.document_id
    WHERE document.active = TRUE
      AND chunk.embedding IS NOT NULL
      AND 1 - (chunk.embedding <=> query_embedding) >= match_threshold
    LIMIT 50
  ),
  fused AS (
    SELECT
      COALESCE(keyword_ranked.id, semantic_ranked.id) AS id,
      semantic_ranked.similarity,
      (
        COALESCE(keyword_weight / (rrf_k + keyword_ranked.rank), 0) +
        COALESCE(semantic_weight / (rrf_k + semantic_ranked.rank), 0)
      )::REAL AS score
    FROM keyword_ranked
    FULL OUTER JOIN semantic_ranked ON semantic_ranked.id = keyword_ranked.id
  )
  SELECT
    chunk.id,
    document.source_key,
    document.title,
    document.category,
    chunk.content,
    document.metadata || chunk.metadata,
    COALESCE(fused.similarity, 0)::REAL,
    fused.score
  FROM fused
  JOIN public.ai_document_chunks AS chunk ON chunk.id = fused.id
  JOIN public.ai_documents AS document ON document.id = chunk.document_id
  ORDER BY fused.score DESC, fused.similarity DESC
  LIMIT LEAST(GREATEST(match_count, 1), 20)
$$;

CREATE OR REPLACE FUNCTION public.hybrid_search_products(
  query_text TEXT,
  query_embedding extensions.vector(1536),
  filter_min_price NUMERIC DEFAULT NULL,
  filter_max_price NUMERIC DEFAULT NULL,
  filter_categories TEXT[] DEFAULT NULL,
  filter_conditions TEXT[] DEFAULT NULL,
  filter_location TEXT DEFAULT NULL,
  match_threshold REAL DEFAULT 0.35,
  match_count INTEGER DEFAULT 8,
  keyword_weight REAL DEFAULT 0.6,
  semantic_weight REAL DEFAULT 0.4,
  rrf_k INTEGER DEFAULT 50
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
  similarity REAL,
  hybrid_score REAL,
  match_mode TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH params AS (
    SELECT websearch_to_tsquery('simple', public.f_unaccent(query_text)) AS text_query
  ),
  eligible AS (
    SELECT
      product.*,
      source.search_vector AS embedding_search_vector,
      source.embedding AS product_embedding
    FROM public.products AS product
    JOIN public.product_embeddings AS source ON source.product_id = product.id
    WHERE product.status::TEXT = 'active'
      AND (filter_min_price IS NULL OR product.price >= filter_min_price)
      AND (filter_max_price IS NULL OR product.price <= filter_max_price)
      AND (filter_categories IS NULL OR product.category::TEXT = ANY(filter_categories))
      AND (filter_conditions IS NULL OR product.condition::TEXT = ANY(filter_conditions))
      AND (
        filter_location IS NULL OR filter_location = '' OR
        public.f_unaccent(product.location) ILIKE
          '%' || public.f_unaccent(filter_location) || '%'
      )
  ),
  keyword_ranked AS (
    SELECT
      eligible.id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(eligible.embedding_search_vector, params.text_query) DESC
      ) AS rank
    FROM eligible
    CROSS JOIN params
    WHERE params.text_query::TEXT <> ''
      AND eligible.embedding_search_vector @@ params.text_query
    LIMIT 75
  ),
  semantic_ranked AS (
    SELECT
      eligible.id,
      (1 - (eligible.product_embedding <=> query_embedding))::REAL AS similarity,
      ROW_NUMBER() OVER (ORDER BY eligible.product_embedding <=> query_embedding) AS rank
    FROM eligible
    WHERE eligible.product_embedding IS NOT NULL
      AND 1 - (eligible.product_embedding <=> query_embedding) >= match_threshold
    LIMIT 75
  ),
  fused AS (
    SELECT
      COALESCE(keyword_ranked.id, semantic_ranked.id) AS id,
      semantic_ranked.similarity,
      (
        COALESCE(keyword_weight / (rrf_k + keyword_ranked.rank), 0) +
        COALESCE(semantic_weight / (rrf_k + semantic_ranked.rank), 0)
      )::REAL AS score
    FROM keyword_ranked
    FULL OUTER JOIN semantic_ranked ON semantic_ranked.id = keyword_ranked.id
  )
  SELECT
    product.id,
    product.seller_id,
    product.title,
    product.description,
    product.price,
    product.category::TEXT,
    product.condition::TEXT,
    product.images,
    product.location,
    product.status::TEXT,
    COALESCE(fused.similarity, 0)::REAL,
    fused.score,
    'hybrid_vector'::TEXT
  FROM fused
  JOIN public.products AS product ON product.id = fused.id
  ORDER BY fused.score DESC, fused.similarity DESC
  LIMIT LEAST(GREATEST(match_count, 1), 20)
$$;

ALTER TABLE public.ai_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON public.ai_documents FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.ai_document_chunks FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.product_embeddings FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.embedding_jobs FROM anon, authenticated;

GRANT ALL PRIVILEGES ON public.ai_documents TO service_role;
GRANT ALL PRIVILEGES ON public.ai_document_chunks TO service_role;
GRANT ALL PRIVILEGES ON public.product_embeddings TO service_role;
GRANT ALL PRIVILEGES ON public.embedding_jobs TO service_role;

REVOKE ALL ON FUNCTION public.claim_embedding_jobs(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_embedding_job(
  UUID, extensions.vector, TEXT, INTEGER
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_embedding_job(UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_embedding_reindex(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hybrid_search_ai_documents(
  TEXT, extensions.vector, REAL, INTEGER, REAL, REAL, INTEGER
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hybrid_search_products(
  TEXT, extensions.vector, NUMERIC, NUMERIC, TEXT[], TEXT[], TEXT,
  REAL, INTEGER, REAL, REAL, INTEGER
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_embedding_jobs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_embedding_job(
  UUID, extensions.vector, TEXT, INTEGER
) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_embedding_job(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_embedding_reindex(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.hybrid_search_ai_documents(
  TEXT, extensions.vector, REAL, INTEGER, REAL, REAL, INTEGER
) TO service_role;
GRANT EXECUTE ON FUNCTION public.hybrid_search_products(
  TEXT, extensions.vector, NUMERIC, NUMERIC, TEXT[], TEXT[], TEXT,
  REAL, INTEGER, REAL, REAL, INTEGER
) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
