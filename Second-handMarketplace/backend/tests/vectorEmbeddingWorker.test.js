const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createVectorEmbeddingWorker,
  retryDelaySeconds,
  runEmbeddingBatch,
  safeErrorMessage,
} = require('../src/workers/vectorEmbeddingWorker');

const embeddingConfig = {
  enabled: true,
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimensions: 1536,
  version: 1,
  apiKey: 'test-key',
};

function sourceQuery(row) {
  return {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return { data: row, error: null };
    },
  };
}

test('embedding worker claims, embeds and completes a current job', async () => {
  const rpcCalls = [];
  const job = {
    id: 'job-1',
    entity_type: 'document_chunk',
    entity_id: 'chunk-1',
    content_hash: 'hash-1',
    attempts: 1,
  };
  const client = {
    rpc(name, args) {
      rpcCalls.push([name, args]);
      if (name === 'claim_embedding_jobs') return Promise.resolve({ data: [job], error: null });
      if (name === 'complete_embedding_job') {
        return Promise.resolve({ data: 'completed', error: null });
      }
      return Promise.resolve({ data: 'pending', error: null });
    },
    from() {
      return sourceQuery({ id: 'chunk-1', content: 'Camera cũ', content_hash: 'hash-1' });
    },
  };

  const result = await runEmbeddingBatch({
    client,
    config: embeddingConfig,
    generate: async () => ({
      embeddings: [Array(1536).fill(0.1)],
      model: embeddingConfig.model,
      version: 1,
    }),
  });

  assert.equal(result.completed, 1);
  assert.ok(rpcCalls.some(([name]) => name === 'complete_embedding_job'));
});

test('embedding worker skips overlapping runs and sanitizes provider errors', async () => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const worker = createVectorEmbeddingWorker({
    runBatch: async () => pending,
    logger: { log() {}, error() {} },
  });
  const first = worker.runOnce();
  const overlapping = await worker.runOnce();
  release({ claimed: 0, completed: 0, stale: 0, failed: 0 });
  await first;

  assert.equal(overlapping.skipped, true);
  assert.equal(retryDelaySeconds(1), 15);
  assert.equal(retryDelaySeconds(10), 3600);
  assert.doesNotMatch(safeErrorMessage(new Error('token-secret-value')), /secret-value/);
});
