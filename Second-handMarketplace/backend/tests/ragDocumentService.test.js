const assert = require('node:assert/strict');
const test = require('node:test');

const {
  chunkDocument,
  contentHash,
  enqueueEmbeddingReindex,
  syncKnowledgeDocuments,
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

test('knowledge sync skips unchanged hashes and deactivates deleted documents', async () => {
  const unchanged = {
    id: 'doc-1',
    source_key: 'safe-trading',
    content_hash: contentHash('An toàn\nKhông chia sẻ OTP.'),
    active: true,
    metadata: { source: 'aiKnowledgeBase' },
  };
  const deleted = {
    id: 'doc-2',
    source_key: 'removed-policy',
    content_hash: 'old',
    active: true,
    metadata: { source: 'aiKnowledgeBase' },
  };
  const updates = [];
  const client = {
    from(table) {
      assert.equal(table, 'ai_documents');
      return {
        async select() {
          return { data: [unchanged, deleted], error: null };
        },
        update(patch) {
          return {
            async eq(field, value) {
              updates.push({ patch, field, value });
              return { error: null };
            },
          };
        },
      };
    },
  };

  const result = await syncKnowledgeDocuments(
    [
      {
        id: 'safe-trading',
        title: 'An toàn',
        content: 'Không chia sẻ OTP.',
        category: 'policy',
      },
    ],
    { client },
  );

  assert.equal(result.unchanged, 1);
  assert.equal(result.deactivated, 1);
  assert.equal(updates[0].value, 'doc-2');
  assert.equal(updates[0].patch.active, false);
});
