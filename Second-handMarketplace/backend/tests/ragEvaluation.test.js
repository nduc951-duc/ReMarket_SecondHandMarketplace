const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { evaluateScenario } = require('../scripts/evaluateRag');

test('Vietnamese RAG evaluation suite covers policy, semantic and budget queries', () => {
  const suite = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'evals', 'rag-vietnamese.json'), 'utf8'),
  );
  assert.ok(suite.length >= 12);
  assert.ok(suite.some((item) => item.expectedSourceKeys));
  assert.ok(suite.some((item) => item.minPrice && item.maxPrice));
  assert.ok(suite.some((item) => /nhỏ gọn|du lịch/i.test(item.query)));
});

test('RAG evaluation rejects products outside hard budget filters', () => {
  const result = evaluateScenario(
    { productIntent: true, maxPrice: 5_000_000 },
    {
      productRequest: true,
      products: [{ id: 'camera', title: 'Camera', price: 8_000_000 }],
      sources: [],
    },
  );
  assert.equal(result.passed, false);
  assert.match(result.failures.join(' '), /maximum price/i);
});
