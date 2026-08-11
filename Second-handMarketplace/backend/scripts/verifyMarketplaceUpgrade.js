const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = require('../src/config/env');

function summarizeError(error) {
  if (!error) return 'ok';
  if (error.code === 'PGRST205') return 'missing table or stale schema cache';
  if (error.code === 'PGRST202') return 'missing RPC or stale schema cache';
  return error.code || error.message || 'unknown error';
}

async function verifyMarketplaceUpgrade(client) {
  const checks = [
    {
      name: 'product comments',
      run: () => client.from('reviews').select('id, product_id').limit(1),
    },
    {
      name: 'seller follows',
      run: () => client.from('seller_follows').select('follower_id, seller_id').limit(1),
    },
    {
      name: 'smart suggestions',
      run: () =>
        client.rpc('smart_product_suggestions', {
          query_text: 'camera',
          max_results: 1,
        }),
    },
    {
      name: 'vector RAG tables',
      run: () => client.from('product_embeddings').select('product_id, content_hash').limit(1),
    },
    {
      name: 'RAG retrieval observability',
      run: () => client.from('rag_retrieval_logs').select('request_id, intent').limit(1),
    },
    {
      name: 'hybrid RAG RPC',
      run: () =>
        client.rpc('hybrid_search_ai_documents', {
          query_text: 'thanh toan',
          query_embedding: Array(1536).fill(0),
          match_count: 1,
        }),
    },
  ];

  return Promise.all(
    checks.map(async ({ name, run }) => {
      try {
        const { error } = await run();
        return { name, ok: !error, detail: summarizeError(error) };
      } catch (error) {
        return { name, ok: false, detail: summarizeError(error) };
      }
    }),
  );
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend environment.');
    process.exitCode = 1;
    return;
  }

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const results = await verifyMarketplaceUpgrade(client);

  results.forEach((result) => {
    console.log(`${result.ok ? 'PASS' : 'FAIL'} | ${result.name} | ${result.detail}`);
  });

  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

if (require.main === module) {
  void main();
}

module.exports = { summarizeError, verifyMarketplaceUpgrade };
