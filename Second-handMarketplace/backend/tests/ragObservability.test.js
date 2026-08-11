const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createResponse } = require('./helpers/httpMocks');
const { loadWithMocks } = require('./helpers/loadWithMocks');

const {
  buildRetrievalLog,
  logRetrieval,
  sanitizeRetrievalQuery,
} = require('../src/services/ragRetrievalLogService');

test('retrieval logging redacts PII and secrets from the query', () => {
  const sanitized = sanitizeRetrievalQuery(
    'Tên tôi là Nguyễn Văn A, địa chỉ 12 đường A, email duc@example.com, số 0912345678, thẻ 9704198526191432198, đơn 123e4567-e89b-12d3-a456-426614174000 token-secret-value',
  );
  assert.doesNotMatch(
    sanitized,
    /Nguyễn Văn A|12 đường A|duc@example|0912345678|9704198526191432198|123e4567|secret-value/,
  );
  assert.match(
    sanitized,
    /\[NAME\]|\[ADDRESS\]|\[EMAIL\]|\[PHONE\]|\[NUMBER\]|\[IDENTIFIER\]|\[SECRET\]/,
  );
});

test('retrieval logs contain request tracing, scores, models and token usage only', async () => {
  let inserted;
  const input = {
    requestId: 'req-rag-1',
    query: 'chính sách hoàn tiền',
    result: {
      intent: 'KNOWLEDGE',
      confidence: 'high',
      sources: [{ id: 'D1', sourceKey: 'refund-policy', score: 0.8, excerpt: 'private' }],
      retrieval: { mode: 'hybrid_vector', latencyMs: 42, model: 'embedding-v2' },
      model: 'llm-v1',
      usage: { inputTokens: 120, outputTokens: 30 },
    },
  };
  const entry = buildRetrievalLog(input);
  assert.deepEqual(entry.retrieved_items, [{ id: 'D1', sourceKey: 'refund-policy', score: 0.8 }]);
  assert.equal(entry.request_id, 'req-rag-1');
  assert.equal(entry.input_tokens, 120);
  assert.equal(JSON.stringify(entry).includes('private'), false);

  const logged = await logRetrieval(input, {
    enabled: true,
    client: {
      from: () => ({
        insert: async (value) => {
          inserted = value;
          return { error: null };
        },
      }),
    },
  });
  assert.equal(logged.persisted, true);
  assert.equal(inserted.request_id, 'req-rag-1');
});

test('RAG observability migration is backend-only under RLS', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '..', 'supabase_rag_observability.sql'),
    'utf8',
  );
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.rag_retrieval_logs/i);
  assert.match(migration, /ALTER TABLE public\.rag_retrieval_logs ENABLE ROW LEVEL SECURITY/i);
  assert.match(
    migration,
    /REVOKE ALL ON TABLE public\.rag_retrieval_logs FROM anon, authenticated/i,
  );
  assert.match(migration, /request_id TEXT NOT NULL/i);
  assert.match(migration, /input_tokens INTEGER/i);
});

test('AI support controller forwards the request ID through retrieval logging', async () => {
  let logged;
  const controller = loadWithMocks(require.resolve('../src/controllers/aiSupportController'), {
    [require.resolve('../src/services/aiSupportService')]: {
      answerAiSupportQuestion: async () => ({
        answer: 'grounded',
        intent: 'KNOWLEDGE',
        confidence: 'high',
      }),
    },
    [require.resolve('../src/services/ragRetrievalLogService')]: {
      logRetrieval: async (entry) => {
        logged = entry;
      },
    },
  });
  const response = createResponse();
  await controller.askAiSupportHandler(
    { body: { message: 'hoàn tiền sao?' }, requestId: 'req-controller-1' },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(logged.requestId, 'req-controller-1');
  assert.equal(logged.query, 'hoàn tiền sao?');
});
