const assert = require('node:assert/strict');
const test = require('node:test');

const {
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
  const answer = buildFallbackAnswer('Thanh toan bi tru tien nhung don hang chua cap nhat', contexts);

  assert.match(answer, /ReMarket/);
  assert.match(answer, /thanh toan/i);
});
