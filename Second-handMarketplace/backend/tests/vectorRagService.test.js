const assert = require('node:assert/strict');
const test = require('node:test');

const { retrieveHybridRag } = require('../src/services/vectorRagService');

const embeddingConfig = {
  enabled: true,
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimensions: 1536,
  version: 3,
  apiKey: 'test-key',
};

test('hybrid retrieval maps citations and forwards hard product filters', async () => {
  const calls = [];
  const embeddingQueries = [];
  const client = {
    rpc(name, args) {
      calls.push([name, args]);
      if (name === 'hybrid_search_ai_documents') {
        return Promise.resolve({
          data: [
            {
              chunk_id: 'chunk-1',
              source_key: 'safe-trading',
              title: 'Giao dịch an toàn',
              category: 'policy',
              content: 'Kiểm tra sản phẩm trước khi thanh toán.',
              hybrid_score: 0.02,
              similarity: 0.81,
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({
        data: [
          {
            id: 'camera-1',
            title: 'Camera Sony cũ',
            price: 4_500_000,
            status: 'active',
            category: 'electronics',
            condition: 'like_new',
            location: 'ha noi',
            images: ['camera.jpg'],
            match_mode: 'hybrid_vector',
            similarity: 0.76,
          },
          { id: 'too-expensive', title: 'Camera Leica', price: 50_000_000, status: 'active' },
          {
            id: 'wrong-condition',
            title: 'Camera mới',
            price: 4_000_000,
            status: 'active',
            category: 'electronics',
            condition: 'new',
            location: 'ha noi',
          },
        ],
        error: null,
      });
    },
  };

  const result = await retrieveHybridRag(
    {
      message: 'Camera cũ dưới 5 triệu ở Hà Nội',
      knowledgeQuery: 'camera cu duoi 5 trieu o ha noi',
      productRequest: true,
      productSearch: 'camera cu',
      maxPrice: 5_000_000,
      location: 'ha noi',
      categories: ['electronics'],
      conditions: ['like_new'],
    },
    {
      client,
      embeddingConfig,
      generateQueryEmbedding: async (query) => ({
        embedding: [embeddingQueries.push(query)],
        model: embeddingConfig.model,
        version: embeddingConfig.version,
      }),
    },
  );

  assert.equal(result.available, true);
  assert.equal(result.contexts[0].citationId, 'D1');
  assert.equal(result.sources[0].sourceKey, 'safe-trading');
  assert.deepEqual(
    result.products.map((product) => product.id),
    ['camera-1'],
  );
  const productCall = calls.find(([name]) => name === 'hybrid_search_products');
  const documentCall = calls.find(([name]) => name === 'hybrid_search_ai_documents');
  assert.deepEqual(embeddingQueries, ['camera cu duoi 5 trieu o ha noi', 'camera cu']);
  assert.equal(documentCall[1].query_text, 'camera cu duoi 5 trieu o ha noi');
  assert.equal(documentCall[1].match_count, 18);
  assert.equal(productCall[1].query_text, 'camera cu');
  assert.equal(productCall[1].match_count, 18);
  assert.equal(productCall[1].filter_max_price, 5_000_000);
  assert.equal(productCall[1].filter_location, 'ha noi');
  assert.deepEqual(productCall[1].filter_categories, ['electronics']);
  assert.deepEqual(productCall[1].filter_conditions, ['like_new']);
});

test('hybrid retrieval reports missing schema without breaking lexical fallback', async () => {
  const result = await retrieveHybridRag(
    { message: 'camera', productRequest: true },
    {
      client: {
        rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'missing RPC' } }),
      },
      embeddingConfig,
      generateQueryEmbedding: async () => ({ embedding: [0.1] }),
    },
  );

  assert.equal(result.available, false);
  assert.equal(result.reason, 'vector_schema_missing');
  assert.deepEqual(result.products, []);
});
