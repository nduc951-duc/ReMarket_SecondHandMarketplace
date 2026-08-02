const assert = require('node:assert/strict');
const test = require('node:test');

const {
  chunkDocument,
  contentHash,
  enqueueEmbeddingReindex,
} = require('../src/services/ragDocumentService');

test('RAG chunking is deterministic, bounded and keeps overlap', () => {
  const text = Array.from({ length: 80 }, (_, index) => `từ-${index}`).join(' ');
  const first = chunkDocument(text, { maxChars: 120, overlapChars: 20 });
  const second = chunkDocument(text, { maxChars: 120, overlapChars: 20 });

  assert.deepEqual(first, second);
  assert.ok(first.length > 1);
  assert.equal(
    first.every((chunk) => chunk.length <= 140),
    true,
  );
  assert.ok(first[1].includes(first[0].split(' ').at(-1)));
});

test('RAG content hashes change when source content changes', () => {
  assert.equal(contentHash('camera'), contentHash('camera'));
  assert.notEqual(contentHash('camera'), contentHash('camera cũ'));
});

test('RAG reindex queues stale model versions explicitly', async () => {
  let received;
  const queued = await enqueueEmbeddingReindex({
    client: {
      rpc: async (name, args) => {
        received = { name, args };
        return { data: 14, error: null };
      },
    },
    model: 'embedding-model-v2',
    version: 2,
  });

  assert.equal(queued, 14);
  assert.deepEqual(received, {
    name: 'enqueue_embedding_reindex',
    args: { target_model: 'embedding-model-v2', target_version: 2 },
  });
});
