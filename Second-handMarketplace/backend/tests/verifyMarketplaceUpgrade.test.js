const assert = require('node:assert/strict');
const test = require('node:test');

const { summarizeError, verifyMarketplaceUpgrade } = require('../scripts/verifyMarketplaceUpgrade');

function queryResult(error = null) {
  const result = Promise.resolve({ data: [], error });
  result.select = () => result;
  result.limit = () => result;
  return result;
}

test('marketplace upgrade verifier checks marketplace and vector capabilities', async () => {
  const calls = [];
  const client = {
    from(table) {
      calls.push(table);
      return queryResult();
    },
    rpc(name) {
      calls.push(name);
      return queryResult();
    },
  };

  const results = await verifyMarketplaceUpgrade(client);

  assert.deepEqual(calls, [
    'reviews',
    'seller_follows',
    'smart_product_suggestions',
    'product_embeddings',
    'rag_retrieval_logs',
    'hybrid_search_ai_documents',
  ]);
  assert.equal(
    results.every((result) => result.ok),
    true,
  );
});

test('marketplace upgrade verifier explains PostgREST schema errors safely', async () => {
  assert.equal(summarizeError({ code: 'PGRST205' }), 'missing table or stale schema cache');
  assert.equal(summarizeError({ code: 'PGRST202' }), 'missing RPC or stale schema cache');
  assert.equal(summarizeError(null), 'ok');
});
