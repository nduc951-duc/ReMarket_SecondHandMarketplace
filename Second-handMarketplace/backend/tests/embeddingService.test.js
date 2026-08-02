const assert = require('node:assert/strict');
const test = require('node:test');

const {
  generateEmbeddings,
  generateQueryEmbedding,
  isEmbeddingConfigured,
  normalizeEmbeddingInput,
} = require('../src/services/embeddingService');

const config = {
  enabled: true,
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimensions: 1536,
  version: 2,
  apiKey: 'test-key',
};

test('embedding config requires explicit enablement and matching dimensions', () => {
  assert.equal(isEmbeddingConfigured(config), true);
  assert.equal(isEmbeddingConfigured({ ...config, enabled: false }), false);
  assert.equal(isEmbeddingConfigured({ ...config, dimensions: 3072 }), false);
});

test('embedding inputs are normalized and bounded', () => {
  assert.equal(normalizeEmbeddingInput('  camera\n  cũ  '), 'camera cũ');
  assert.equal(normalizeEmbeddingInput('x'.repeat(13000)).length, 12000);
});

test('embedding provider response preserves input order and version metadata', async () => {
  let requestBody = null;
  const vectors = [Array(1536).fill(0), Array(1536).fill(0)];
  vectors[0][0] = 1;
  vectors[1][1] = 1;
  const result = await generateEmbeddings(['camera', 'laptop'], {
    config,
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          data: [
            { index: 1, embedding: vectors[1] },
            { index: 0, embedding: vectors[0] },
          ],
          usage: { total_tokens: 4 },
        }),
      };
    },
  });

  assert.deepEqual(requestBody.input, ['camera', 'laptop']);
  assert.equal(requestBody.dimensions, 1536);
  assert.equal(result.embeddings[0][0], 1);
  assert.equal(result.embeddings[1][1], 1);
  assert.equal(result.version, 2);
});

test('Gemini embeddings use the free-tier endpoint with retrieval task types', async () => {
  const requests = [];
  const geminiConfig = {
    ...config,
    provider: 'gemini',
    model: 'gemini-embedding-001',
  };
  const fetchImpl = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return {
      ok: true,
      json: async () => ({
        embeddings: [{ values: [1, ...Array(1535).fill(0)] }],
      }),
    };
  };

  const result = await generateQueryEmbedding('camera cho du lich', {
    config: geminiConfig,
    fetchImpl,
  });

  assert.match(requests[0].url, /gemini-embedding-001:batchEmbedContents$/);
  assert.equal(requests[0].options.headers['x-goog-api-key'], 'test-key');
  assert.equal(requests[0].body.requests[0].taskType, 'RETRIEVAL_QUERY');
  assert.equal(requests[0].body.requests[0].outputDimensionality, 1536);
  assert.equal(result.embedding.length, 1536);
  assert.equal(result.provider, 'gemini');
});
