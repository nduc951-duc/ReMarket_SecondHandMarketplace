const assert = require('node:assert/strict');
const test = require('node:test');

const {
  answerAiSupportQuestion,
  buildFallbackAnswer,
  retrieveKnowledge,
  tokenize,
} = require('../src/services/aiSupportService');

test('tokenize normalizes Vietnamese accents for matching', () => {
  assert.deepEqual(tokenize('Tôi muốn hoàn tiền giao dịch'), ['hoan', 'tien', 'giao', 'dich']);
});

test('retrieveKnowledge returns refund policy for refund questions', () => {
  const contexts = retrieveKnowledge('San pham khac mo ta thi hoan tien nhu the nao?');

  assert.equal(contexts.length > 0, true);
  assert.equal(contexts[0].id, 'refund-policy');
});

test('buildFallbackAnswer recommends human support when context is missing', () => {
  const answer = buildFallbackAnswer('Cau hoi ngoai pham vi', []);

  assert.match(answer, /liên hệ nhân viên hỗ trợ/i);
});

test('buildFallbackAnswer summarizes matched internal knowledge', () => {
  const contexts = retrieveKnowledge('Thanh toan bi tru tien nhung don hang chua cap nhat');
  const answer = buildFallbackAnswer(
    'Thanh toan bi tru tien nhung don hang chua cap nhat',
    contexts,
  );

  assert.match(answer, /ReMarket/);
  assert.match(answer, /thanh toan/i);
});

test('low confidence returns no-answer without calling the LLM', async () => {
  let providerCalls = 0;
  const result = await answerAiSupportQuestion(
    { message: 'Chính sách chưa có trong dữ liệu' },
    {
      retrieveContext: async () => ({
        confidence: 'low',
        contexts: [],
        intent: 'KNOWLEDGE',
        parsedQuery: {},
        productRequest: false,
        products: [],
        shouldAnswer: false,
        sources: [],
        retrieval: { mode: 'lexical_fallback', threshold: 0.2 },
      }),
      provider: { call: async () => (providerCalls += 1) },
    },
  );

  assert.equal(result.mode, 'no_answer');
  assert.equal(result.confidence, 'low');
  assert.equal(providerCalls, 0);
  assert.match(result.answer, /liên hệ nhân viên hỗ trợ/i);
});

test('unsupported LLM citations switch the response to grounded fallback', async () => {
  const context = {
    id: 'refund-policy',
    citationId: 'D1',
    title: 'Hoàn tiền',
    category: 'policy',
    content: 'Có thể yêu cầu hoàn tiền khi sản phẩm khác mô tả.',
    score: 1,
  };
  const result = await answerAiSupportQuestion(
    { message: 'Sản phẩm khác mô tả hoàn tiền sao?' },
    {
      retrieveContext: async () => ({
        confidence: 'high',
        contexts: [context],
        intent: 'KNOWLEDGE',
        parsedQuery: {},
        productRequest: false,
        products: [],
        shouldAnswer: true,
        sources: [
          {
            id: 'D1',
            sourceKey: context.id,
            title: context.title,
            category: context.category,
            score: 1,
            excerpt: context.content,
          },
        ],
        retrieval: { mode: 'hybrid_vector' },
      }),
      provider: {
        id: 'test',
        model: 'unsafe-model',
        call: async () => ({ answer: 'ReMarket bảo hành trọn đời [D99].', usage: {} }),
      },
    },
  );

  assert.equal(result.mode, 'citation_fallback');
  assert.doesNotMatch(result.answer, /trọn đời|D99/i);
  assert.match(result.answer, /\[D1\]/);
});
