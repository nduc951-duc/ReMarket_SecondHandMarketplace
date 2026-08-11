const { createClient } = require('@supabase/supabase-js');
const {
  RAG_RETRIEVAL_LOG_ENABLED,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');
const logger = require('./logger');

let adminClient;

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

function sanitizeRetrievalQuery(value = '') {
  return String(value)
    .replace(
      /(?:^|[\s,])(?:tên tôi là|ten toi la|họ tên|ho ten)\s*[:-]?\s*[^,.!?]{2,80}/gi,
      ' [NAME]',
    )
    .replace(/(?:^|[\s,])(?:địa chỉ|dia chi)\s*[:-]?\s*[^,.!?]{3,120}/gi, ' [ADDRESS]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[EMAIL]')
    .replace(/(?:\+?84|0)\d{8,10}\b/g, '[PHONE]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '[IDENTIFIER]')
    .replace(/\b\d{12,19}\b/g, '[NUMBER]')
    .replace(/(?:sk|key|token)-[a-z0-9_-]+/gi, '[SECRET]')
    .slice(0, 500);
}

function buildRetrievalLog({ requestId, query, result }) {
  const sources = (result?.sources || []).map((source) => ({
    id: source.id,
    sourceKey: source.sourceKey,
    score: Number(source.score || 0),
  }));
  const products = (result?.products || []).map((product) => ({
    id: product.id,
    citationId: product.citation_id,
    score: Number(product.rerankScore || product.relevance_score || product.similarity || 0),
  }));
  return {
    request_id: String(requestId || 'unknown').slice(0, 100),
    sanitized_query: sanitizeRetrievalQuery(query),
    intent: result?.intent || 'OUT_OF_SCOPE',
    confidence: result?.confidence || 'low',
    retrieved_items: [...sources, ...products],
    retrieval_mode: result?.retrieval?.mode || 'unknown',
    latency_ms: Number(result?.retrieval?.latencyMs || 0),
    embedding_model: result?.retrieval?.model || null,
    llm_model: result?.model || null,
    input_tokens: Number(result?.usage?.inputTokens || 0),
    output_tokens: Number(result?.usage?.outputTokens || 0),
  };
}

async function logRetrieval(input, options = {}) {
  const entry = buildRetrievalLog(input);
  logger.info('rag_retrieval_completed', { requestId: entry.request_id, ...entry });
  if (!(options.enabled ?? RAG_RETRIEVAL_LOG_ENABLED)) return { persisted: false, entry };
  const client = options.client || getAdminClient();
  if (!client) return { persisted: false, entry };
  try {
    const { error } = await client.from('rag_retrieval_logs').insert(entry);
    if (!error) return { persisted: true, entry };
    logger.warn('rag_retrieval_persistence_failed', {
      requestId: entry.request_id,
      code: error.code,
    });
  } catch (error) {
    logger.warn('rag_retrieval_persistence_failed', {
      requestId: entry.request_id,
      code: error?.code || 'NETWORK_ERROR',
    });
  }
  return { persisted: false, entry };
}

module.exports = { buildRetrievalLog, logRetrieval, sanitizeRetrievalQuery };
