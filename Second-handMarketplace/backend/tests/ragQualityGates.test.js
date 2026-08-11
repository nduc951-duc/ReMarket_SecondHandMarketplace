const assert = require('node:assert/strict');
const test = require('node:test');

const { semanticChunkDocument } = require('../src/rag/ingestion/semanticChunker');
const { validateCitations } = require('../src/rag/generation/citationValidator');
const { assessRetrievalConfidence } = require('../src/rag/retrieval/confidence');
const { rerankCandidates } = require('../src/rag/retrieval/reranker');

test('semantic chunking follows headings, 250–400 tokens and 40–70 overlap', () => {
  const section = (label, start) =>
    `## ${label}\n${Array.from({ length: 520 }, (_, index) => `từ${start + index}`).join(' ')}`;
  const chunks = semanticChunkDocument({
    title: 'Chính sách hoàn tiền',
    category: 'policy',
    sourceKey: 'refund-policy',
    content: `${section('Điều kiện', 0)}\n\n${section('Quy trình', 600)}`,
  });

  assert.ok(chunks.length >= 3);
  assert.ok(chunks.every((chunk) => chunk.tokenCount >= 250 && chunk.tokenCount <= 400));
  assert.ok(chunks.every((chunk) => chunk.content.includes('Title: Chính sách hoàn tiền')));
  assert.ok(chunks.every((chunk) => chunk.content.includes('Category: policy')));
  assert.ok(chunks.every((chunk) => chunk.content.includes('Source: refund-policy')));
  const firstTail = chunks[0].body.split(/\s+/).slice(-50).join(' ');
  assert.ok(chunks[1].body.startsWith(firstTail));
});

test('reranker uses 15–20 candidates, deduplicates and returns top 4–6', () => {
  const candidates = Array.from({ length: 18 }, (_, index) => ({
    id: `chunk-${index}`,
    title: index === 12 ? 'Hoàn tiền hàng khác mô tả' : `Tài liệu ${index}`,
    content: index === 13 ? 'Hoàn tiền hàng khác mô tả' : `Nội dung riêng ${index}`,
    score: index === 12 ? 0.2 : 0.01,
  }));
  candidates[14].content = candidates[13].content;
  const ranked = rerankCandidates('hoàn tiền hàng khác mô tả', candidates);
  assert.equal(ranked.length, 5);
  assert.equal(ranked[0].id, 'chunk-12');
  assert.equal(ranked.filter((item) => item.content === candidates[13].content).length, 1);
  assert.equal(rerankCandidates('query', candidates, { enabled: false }).length, 5);
});

test('confidence blocks LLM below configurable threshold', () => {
  const low = assessRetrievalConfidence([{ score: 0.1 }], { threshold: 0.2 });
  assert.equal(low.confidence, 'low');
  assert.equal(low.shouldAnswer, false);
  const high = assessRetrievalConfidence([{ score: 0.5 }], { threshold: 0.2 });
  assert.equal(high.confidence, 'high');
  assert.equal(high.shouldAnswer, true);
});

test('citation validator removes unknown references and rejects unsupported policy claims', () => {
  const sources = [
    {
      id: 'D1',
      title: 'Hoàn tiền',
      excerpt: 'Người mua có thể yêu cầu hoàn tiền khi sản phẩm khác mô tả.',
    },
  ];
  const supported = validateCitations('Sản phẩm khác mô tả có thể yêu cầu hoàn tiền [D1].', {
    sources,
  });
  assert.equal(supported.valid, true);

  const unsupported = validateCitations(
    'Chính sách bảo hành trọn đời [D9]. Xem /products/invented.',
    { sources },
  );
  assert.equal(unsupported.valid, false);
  assert.doesNotMatch(unsupported.answer, /D9|invented/);
});

test('product prices and condition require an existing product citation', () => {
  const products = [
    {
      id: 'phone-1',
      citation_id: 'P1',
      title: 'iPhone 13',
      price: 7_500_000,
      condition: 'like_new',
      location: 'Hồ Chí Minh',
    },
  ];
  assert.equal(
    validateCitations('iPhone 13 giá 7.500.000 VND, tình trạng like_new [P1].', { products }).valid,
    true,
  );
  assert.equal(
    validateCitations('iPhone 13 giá 7.500.000 VND, tình trạng like_new.', { products }).valid,
    false,
  );
});
