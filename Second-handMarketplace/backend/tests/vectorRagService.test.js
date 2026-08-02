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
            location: 'ha noi',
            images: ['camera.jpg'],
            match_mode: 'hybrid_vector',
            similarity: 0.76,
          },
          { id: 'too-expensive', title: 'Camera Leica', price: 50_000_000, status: 'active' },
        ],
        error: null,
      });
    },
  };

  const result = await retrieveHybridRag(
    {
      message: 'Camera cũ dưới 5 triệu ở Hà Nội',
      productRequest: true,
      productSearch: 'camera cu',
      maxPrice: 5_000_000,
      location: 'ha noi',
    },
    {
      client,
      embeddingConfig,
      generateQueryEmbedding: async () => ({
        embedding: [0.1],
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
  assert.equal(productCall[1].filter_max_price, 5_000_000);
  assert.equal(productCall[1].filter_location, 'ha noi');
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
