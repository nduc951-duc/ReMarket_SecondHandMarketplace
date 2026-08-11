const assert = require('node:assert/strict');
const test = require('node:test');

const { INTENTS, routeIntent } = require('../src/rag/retrieval/intentRouter');
const { parseProductQuery } = require('../src/rag/retrieval/queryParser');

const intentCases = [
  ['sản phẩm khác mô tả thì hoàn tiền sao?', INTENTS.KNOWLEDGE],
  ['chính sách đổi trả của ReMarket là gì?', INTENTS.KNOWLEDGE],
  ['làm sao giao dịch an toàn?', INTENTS.KNOWLEDGE],
  ['tôi nghi người bán lừa đảo thì làm gì?', INTENTS.KNOWLEDGE],
  ['đăng bán sản phẩm cần thông tin nào?', INTENTS.KNOWLEDGE],
  ['tìm iPhone dưới 8 triệu', INTENTS.PRODUCT_SEARCH],
  ['mua laptop từ 10 đến 15 triệu ở HCM', INTENTS.PRODUCT_SEARCH],
  ['gợi ý camera du lịch nhỏ gọn', INTENTS.PRODUCT_SEARCH],
  ['cần túi đeo chéo như mới', INTENTS.PRODUCT_SEARCH],
  ['có điện thoại nào bán không?', INTENTS.PRODUCT_SEARCH],
  ['đơn hàng của tôi đang ở đâu?', INTENTS.TRANSACTION],
  ['kiểm tra trạng thái đơn giúp mình', INTENTS.TRANSACTION],
  ['người bán đã xác nhận đơn của em chưa?', INTENTS.TRANSACTION],
  ['xem lịch sử giao dịch của tôi', INTENTS.TRANSACTION],
  ['đơn #abc-123 đã giao chưa?', INTENTS.TRANSACTION],
  ['thời tiết hôm nay thế nào?', INTENTS.OUT_OF_SCOPE],
  ['viết cho tôi một bài thơ', INTENTS.OUT_OF_SCOPE],
  ['ai là tổng thống Mỹ?', INTENTS.OUT_OF_SCOPE],
  ['giải phương trình bậc hai', INTENTS.OUT_OF_SCOPE],
  ['kể chuyện cười đi', INTENTS.OUT_OF_SCOPE],
  ['hướng dẫn khiếu nại hàng giả', INTENTS.KNOWLEDGE],
  ['tìm máy tính bảng mới 100%', INTENTS.PRODUCT_SEARCH],
  ['các dòng laptop mà bên mình có', INTENTS.PRODUCT_SEARCH],
  ['camera bên bạn có những loại nào, giá rẻ?', INTENTS.PRODUCT_SEARCH],
  ['đơn của mình bị hủy vì sao?', INTENTS.TRANSACTION],
  ['bảo mật tài khoản như thế nào?', INTENTS.KNOWLEDGE],
];

test('intent router classifies at least 20 Vietnamese utterances', () => {
  assert.ok(intentCases.length >= 20);
  for (const [query, expected] of intentCases) {
    assert.equal(routeIntent(query).intent, expected, query);
  }
});

test('query parser extracts range, location, category and removes filters from semantics', () => {
  const parsed = parseProductQuery('laptop từ 10–15 triệu ở HCM');
  assert.equal(parsed.minPrice, 10_000_000);
  assert.equal(parsed.maxPrice, 15_000_000);
  assert.equal(parsed.location, 'Hồ Chí Minh');
  assert.equal(parsed.category, 'electronics');
  assert.equal(parsed.semanticQuery, 'laptop');
});

test('query parser supports 5tr, 5 triệu and 5.000.000', () => {
  assert.equal(parseProductQuery('camera dưới 5tr').maxPrice, 5_000_000);
  assert.equal(parseProductQuery('camera dưới 5 triệu').maxPrice, 5_000_000);
  assert.equal(parseProductQuery('camera dưới 5.000.000').maxPrice, 5_000_000);
});

test('query parser extracts hard condition and keeps product need as semantic query', () => {
  const parsed = parseProductQuery('Tìm camera du lịch như mới dưới 5 triệu ở Đà Nẵng');
  assert.equal(parsed.condition, 'like_new');
  assert.equal(parsed.location, 'Đà Nẵng');
  assert.equal(parsed.maxPrice, 5_000_000);
  assert.equal(parsed.semanticQuery, 'camera du lich');
});

test('query parser removes conversational catalog wording from product semantics', () => {
  assert.equal(parseProductQuery('các dòng laptop mà bên mình có').semanticQuery, 'laptop');
  assert.equal(
    parseProductQuery('camera bên bạn có những loại nào, giá rẻ?').semanticQuery,
    'camera',
  );
});
