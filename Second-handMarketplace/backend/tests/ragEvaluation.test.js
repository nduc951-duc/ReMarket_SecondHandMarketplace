const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { evaluateScenario, evaluateSuiteOffline, meetsBaseline } = require('../scripts/evaluateRag');

test('Vietnamese RAG evaluation suite has at least 50 diverse scenarios', () => {
  const suite = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'evals', 'rag-vietnamese.json'), 'utf8'),
  );
  assert.ok(suite.length >= 50);
  assert.ok(suite.some((item) => item.expectedSourceKeys));
  assert.ok(suite.some((item) => item.minPrice && item.maxPrice));
  assert.ok(suite.some((item) => /nhỏ gọn|du lịch/i.test(item.query)));
  assert.ok(suite.some((item) => /ko|dc|hòan|hướg/i.test(item.query)));
  assert.ok(suite.some((item) => item.expectedIntent === 'OUT_OF_SCOPE'));
  assert.ok(suite.some((item) => item.id.startsWith('a')));
});

test('RAG evaluation measures intent, Recall@5, MRR and hard-filter accuracy', () => {
  const suite = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'evals', 'rag-vietnamese.json'), 'utf8'),
  );
  const baseline = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'evals', 'rag-baseline.json'), 'utf8'),
  );
  const metrics = evaluateSuiteOffline(suite);
  assert.equal(metrics.total, suite.length);
  for (const metric of ['intentAccuracy', 'recallAt5', 'mrr', 'filterAccuracy']) {
    assert.equal(Number.isFinite(metrics[metric]), true);
  }
  assert.equal(meetsBaseline(metrics, baseline), true, JSON.stringify(metrics, null, 2));
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
