const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = require('../config/env');
const {
  generateQueryEmbedding,
  getEmbeddingConfig,
  isEmbeddingConfigured,
} = require('./embeddingService');
const { RAG_RERANK_CANDIDATES, RAG_RERANK_ENABLED, RAG_RERANK_TOP_K } = require('../config/env');
const { rerankCandidates } = require('../rag/retrieval/reranker');
const { locationMatches } = require('../rag/retrieval/queryParser');

let adminClient = null;

function getAdminClient() {
  if (adminClient) return adminClient;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Thieu cau hinh Supabase cho vector RAG.');
  }
  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

function isVectorSchemaMissing(error) {
  return (
    ['PGRST202', 'PGRST205'].includes(error?.code) ||
    /hybrid_search_|vector|schema cache|does not exist/i.test(String(error?.message || ''))
  );
}

function normalizeFilterList(value) {
  if (!value) return null;
  const values = Array.isArray(value) ? value : String(value).split(',');
  const normalized = values.map((item) => String(item).trim()).filter(Boolean);
  return normalized.length ? normalized : null;
}

function normalizeComparable(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .toLocaleLowerCase('vi-VN');
}

function mapKnowledgeRows(rows = []) {
  return rows.map((row, index) => ({
    id: row.source_key,
    chunkId: row.chunk_id,
    citationId: `D${index + 1}`,
    title: row.title,
    category: row.category,
    content: row.content,
    metadata: row.metadata || {},
    score: Number(row.hybrid_score || 0),
    similarity: Number(row.similarity || 0),
    retrievalMode: 'hybrid_vector',
  }));
}

function mapProductRows(rows = [], filters = {}) {
  const categories = normalizeFilterList(filters.categories);
  const conditions = normalizeFilterList(filters.conditions);
  const normalizedLocation = normalizeComparable(filters.location);

  return rows
    .filter((row) => row.status === 'active')
    .filter(
      (row) => filters.minPrice === undefined || Number(row.price) >= Number(filters.minPrice),
    )
    .filter(
      (row) => filters.maxPrice === undefined || Number(row.price) <= Number(filters.maxPrice),
    )
    .filter((row) => !categories || categories.includes(String(row.category)))
    .filter((row) => !conditions || conditions.includes(String(row.condition)))
    .filter((row) => !normalizedLocation || locationMatches(row.location, filters.location))
    .map((row, index) => ({
      id: row.id,
      citation_id: `P${index + 1}`,
      title: row.title,
      description: row.description,
      price: Number(row.price),
      category: row.category,
      condition: row.condition,
      location: row.location,
      image_url: row.images?.[0] || '',
      match_mode: row.match_mode || 'hybrid_vector',
      similarity: Number(row.similarity || 0),
      relevance_score: Number(row.hybrid_score || 0),
    }));
}

function buildSources(contexts) {
  return contexts.map((context) => ({
    id: context.citationId,
    sourceKey: context.id,
    title: context.title,
    category: context.category,
    score: context.score,
    excerpt: String(context.content || '').slice(0, 180),
  }));
}

function assignKnowledgeCitations(contexts) {
  return contexts.map((context, index) => ({ ...context, citationId: `D${index + 1}` }));
}

function assignProductCitations(products) {
  return products.map((product, index) => ({ ...product, citation_id: `P${index + 1}` }));
}

async function retrieveHybridRag(
  {
    message,
    knowledgeQuery = message,
    productRequest = false,
    productSearch = message,
    minPrice,
    maxPrice,
    categories,
    conditions,
    location,
    documentLimit = RAG_RERANK_CANDIDATES,
    productLimit = RAG_RERANK_CANDIDATES,
  },
  options = {},
) {
  const startedAt = Date.now();
  const config = options.embeddingConfig || getEmbeddingConfig();
  if (!isEmbeddingConfigured(config)) {
    return {
      available: false,
      reason: 'embedding_not_configured',
      contexts: [],
      products: [],
      sources: [],
    };
  }

  try {
    const embed = options.generateQueryEmbedding || generateQueryEmbedding;
    const knowledgeEmbedding = await embed(knowledgeQuery, {
      config,
      fetchImpl: options.fetchImpl,
    });
    const productEmbedding = productRequest
      ? await embed(productSearch, { config, fetchImpl: options.fetchImpl })
      : knowledgeEmbedding;
    const client = options.client || getAdminClient();
    const documentPromise = client.rpc('hybrid_search_ai_documents', {
      query_text: knowledgeQuery,
      query_embedding: knowledgeEmbedding.embedding,
      match_threshold: 0.35,
      match_count: documentLimit,
      keyword_weight: 0.55,
      semantic_weight: 0.45,
      rrf_k: 50,
    });
    const productPromise = productRequest
      ? client.rpc('hybrid_search_products', {
          query_text: productSearch,
          query_embedding: productEmbedding.embedding,
          filter_min_price: minPrice ?? null,
          filter_max_price: maxPrice ?? null,
          filter_categories: normalizeFilterList(categories),
          filter_conditions: normalizeFilterList(conditions),
          filter_location:
            normalizeComparable(location) === 'ho chi minh' ? null : location || null,
          match_threshold: 0.35,
          match_count: productLimit,
          keyword_weight: 0.6,
          semantic_weight: 0.4,
          rrf_k: 50,
        })
      : Promise.resolve({ data: [], error: null });
    const [documentResult, productResult] = await Promise.all([documentPromise, productPromise]);
    const errors = [documentResult.error, productResult.error].filter(Boolean);

    if (errors.length) {
      return {
        available: false,
        reason: errors.some(isVectorSchemaMissing) ? 'vector_schema_missing' : 'vector_rpc_error',
        contexts: [],
        products: [],
        sources: [],
      };
    }

    const contexts = assignKnowledgeCitations(
      rerankCandidates(knowledgeQuery, mapKnowledgeRows(documentResult.data || []), {
        enabled: options.rerankEnabled ?? RAG_RERANK_ENABLED,
        candidateLimit: documentLimit,
        topK: options.rerankTopK || RAG_RERANK_TOP_K,
      }),
    );
    const products = assignProductCitations(
      rerankCandidates(
        productSearch,
        mapProductRows(productResult.data || [], {
          minPrice,
          maxPrice,
          categories,
          conditions,
          location,
        }),
        {
          enabled: options.rerankEnabled ?? RAG_RERANK_ENABLED,
          candidateLimit: productLimit,
          topK: options.rerankTopK || RAG_RERANK_TOP_K,
        },
      ),
    );
    return {
      available: true,
      reason: null,
      mode: 'hybrid_vector',
      model: knowledgeEmbedding.model,
      version: knowledgeEmbedding.version,
      latencyMs: Date.now() - startedAt,
      contexts,
      products,
      sources: buildSources(contexts),
      queries: { knowledge: knowledgeQuery, product: productRequest ? productSearch : null },
    };
  } catch (error) {
    return {
      available: false,
      reason: isVectorSchemaMissing(error) ? 'vector_schema_missing' : 'embedding_error',
      contexts: [],
      products: [],
      sources: [],
    };
  }
}

module.exports = {
  buildSources,
  isVectorSchemaMissing,
  mapKnowledgeRows,
  mapProductRows,
  normalizeComparable,
  normalizeFilterList,
  retrieveHybridRag,
};
