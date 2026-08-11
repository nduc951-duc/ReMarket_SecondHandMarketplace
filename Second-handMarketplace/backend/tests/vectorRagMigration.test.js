const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase_vector_rag.sql'), 'utf8');

test('vector RAG migration creates versioned HNSW embeddings', () => {
  assert.match(migration, /BEGIN;[\s\S]+COMMIT;/i);
  assert.match(migration, /CREATE EXTENSION IF NOT EXISTS vector/i);
  assert.match(migration, /embedding extensions\.vector\(1536\)/i);
  assert.match(migration, /USING hnsw \(embedding extensions\.vector_cosine_ops\)/i);
  assert.match(migration, /embedding_model TEXT/i);
  assert.match(migration, /embedding_version INTEGER/i);
});

test('vector RAG queue claims jobs atomically and prevents stale writes', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.embedding_jobs/i);
  assert.match(migration, /FOR UPDATE SKIP LOCKED/i);
  assert.match(migration, /content_hash = target_job\.content_hash/i);
  assert.match(migration, /NEW\.content_hash := OLD\.content_hash/i);
  assert.match(migration, /THEN 'completed' ELSE 'stale'/i);
  assert.match(migration, /attempts >= target_job\.max_attempts/i);
  assert.match(migration, /THEN 'failed'/i);
  assert.match(migration, /next_attempt_at/i);
  assert.match(migration, /enqueue_embedding_reindex/i);
  assert.match(migration, /embedding_model IS DISTINCT FROM target_model/i);
  assert.match(migration, /embedding_version IS DISTINCT FROM target_version/i);
});

test('backend exposes a full model reindex command', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
  );
  assert.match(packageJson.scripts['rag:reindex'], /syncAiKnowledge\.js --reindex/);
  assert.match(migration, /embedding_model IS DISTINCT FROM target_model/i);
  assert.match(migration, /embedding_version IS DISTINCT FROM target_version/i);
});

test('hybrid product search keeps marketplace hard filters in SQL', () => {
  assert.match(migration, /hybrid_search_products/i);
  assert.match(migration, /product\.status::TEXT = 'active'/i);
  assert.match(migration, /product\.price <= filter_max_price/i);
  assert.match(migration, /product\.condition::TEXT = ANY\(filter_conditions\)/i);
  assert.match(migration, /FULL OUTER JOIN semantic_ranked/i);
  assert.match(migration, /keyword_weight \/ \(rrf_k \+ keyword_ranked\.rank\)/i);
  assert.match(migration, /source\.search_vector AS embedding_search_vector/i);
  assert.match(migration, /source\.embedding AS product_embedding/i);
  assert.doesNotMatch(migration, /eligible\.search_vector/i);
});

test('embedding tables and RPCs remain backend-only', () => {
  for (const table of [
    'ai_documents',
    'ai_document_chunks',
    'product_embeddings',
    'embedding_jobs',
  ]) {
    assert.match(
      migration,
      new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'),
    );
    assert.match(
      migration,
      new RegExp(`REVOKE ALL PRIVILEGES ON public\\.${table} FROM anon, authenticated`, 'i'),
    );
  }
  assert.doesNotMatch(
    migration,
    /GRANT EXECUTE[\s\S]+TO anon|GRANT EXECUTE[\s\S]+TO authenticated/i,
  );
});
