-- Backend-only retrieval telemetry for RAG quality analysis.
-- Queries are sanitized in the application before insertion; no prompt context,
-- personal data, provider response, API key, or secret is stored here.

CREATE TABLE IF NOT EXISTS public.rag_retrieval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  sanitized_query TEXT NOT NULL CHECK (char_length(sanitized_query) <= 500),
  intent TEXT NOT NULL CHECK (intent IN ('KNOWLEDGE', 'PRODUCT_SEARCH', 'TRANSACTION', 'OUT_OF_SCOPE')),
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  retrieved_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  retrieval_mode TEXT NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  embedding_model TEXT,
  llm_model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_retrieval_logs_request
  ON public.rag_retrieval_logs(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_retrieval_logs_created
  ON public.rag_retrieval_logs(created_at DESC);

ALTER TABLE public.rag_retrieval_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rag_retrieval_logs FROM anon, authenticated;
GRANT ALL ON TABLE public.rag_retrieval_logs TO service_role;

NOTIFY pgrst, 'reload schema';
