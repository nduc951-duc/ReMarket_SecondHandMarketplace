const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { scoreProductMatch } = require('../src/models/products/productModel');
const { loadWithMocks } = require('./helpers/loadWithMocks');

const aiSupportService = require('../src/services/aiSupportService');

test('AI query analysis extracts Vietnamese price ranges without reversing hard filters', () => {
  assert.deepEqual(aiSupportService.parsePriceFilters('Laptop từ 10 đến 20 triệu'), {
    minPrice: 10_000_000,
    maxPrice: 20_000_000,
  });
  assert.deepEqual(aiSupportService.parsePriceFilters('Camera trên 5 triệu'), {
    minPrice: 5_000_000,
    maxPrice: undefined,
  });
});

test('grounding keeps retrieved product links and removes invented links or citations', () => {
  const answer = aiSupportService.sanitizeGroundedAnswer(
    'Xem [D1] [P1] /products/product-1 và [D9] [P9] /products/fake-id',
    [{ id: 'product-1', citation_id: 'P1' }],
    [{ id: 'D1' }],
  );

  assert.match(answer, /\[D1\]/);
  assert.match(answer, /\[P1\]/);
  assert.match(answer, /\/products\/product-1/);
  assert.doesNotMatch(answer, /\[D9\]|\[P9\]|\/products\/fake-id/);
});

test('fuzzy score ranks an accent-less near match above an unrelated product', () => {
  const camera = scoreProductMatch('camra cu', {
    title: 'Máy camera cũ Sony',
    description: 'Ngoại hình còn tốt',
  });
  const bag = scoreProductMatch('camra cu', {
    title: 'Túi đeo chéo màu nâu',
    description: 'Túi da đã sử dụng',
  });

  assert.ok(camera > bag);
  assert.ok(camera >= 0.65);
  assert.ok(bag < 0.65);
});

test('fuzzy score maps camera to may anh without accepting may lanh', () => {
  const camera = scoreProductMatch('camera', {
    title: 'Máy ảnh Fujifilm X-T30 kèm lens kit',
    description: 'Máy ảnh cũ còn hoạt động tốt.',
  });
  const airConditioner = scoreProductMatch('camera', {
    title: 'Máy lạnh Daikin inverter',
    description: 'Máy làm lạnh tiết kiệm điện.',
  });
  const deskLamp = scoreProductMatch('camera', {
    title: 'Đèn bàn decor ánh sáng ấm',
    description: 'Đèn kim loại dùng cho bàn làm việc.',
  });

  assert.ok(camera >= 0.65);
  assert.ok(airConditioner < 0.65);
  assert.ok(deskLamp < 0.65);
});

test('smart search migration installs trigram suggestions', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase_smart_product_search.sql'),
    'utf8',
  );
  assert.match(sql, /CREATE EXTENSION IF NOT EXISTS pg_trgm/i);
  assert.match(sql, /smart_product_suggestions/i);
  assert.match(sql, /word_similarity/i);
  assert.match(sql, /product\.status::TEXT = 'active'/i);
});

test('AI product advisor parses a Vietnamese budget and returns live products', async () => {
  let receivedFilters = null;
  const service = loadWithMocks(require.resolve('../src/services/aiSupportService'), {
    [require.resolve('../src/models/products/productModel')]: {
      scoreProductMatch,
      getProducts: async (filters) => {
        receivedFilters = filters;
        return {
          products: [
            {
              id: 'camera-1',
              title: 'Camera Sony cũ',
              price: 4_500_000,
              condition: 'good',
              location: 'TP.HCM',
              images: ['camera.jpg'],
            },
            {
              id: 'camera-too-expensive',
              title: 'Camera Leica cũ',
              price: 45_000_000,
            },
            {
              id: 'unrelated',
              title: 'Máy lạnh Daikin',
              price: 3_000_000,
            },
          ],
          pagination: { matchMode: 'fuzzy' },
        };
      },
    },
  });

  const products = await service.retrieveProductRecommendations('Tìm camera cũ dưới 5 triệu');

  assert.equal(receivedFilters.max_price, 5_000_000);
  assert.deepEqual(
    products.map((product) => product.id),
    ['camera-1'],
  );
  assert.equal(products[0].match_mode, 'fuzzy');
});

test('AI product advisor never asks a provider to invent products when search is empty', async () => {
  const originalApiKey = process.env.GROQ_API_KEY;
  const originalFetch = global.fetch;
  let providerCalled = false;
  process.env.GROQ_API_KEY = 'test-key';
  global.fetch = async () => {
    providerCalled = true;
    throw new Error('provider must not be called');
  };

  try {
    const service = loadWithMocks(require.resolve('../src/services/aiSupportService'), {
      [require.resolve('../src/models/products/productModel')]: {
        scoreProductMatch,
        getProducts: async () => ({ products: [], pagination: { matchMode: 'fuzzy' } }),
      },
      [require.resolve('../src/services/vectorRagService')]: {
        retrieveHybridRag: async () => ({
          available: false,
          reason: 'test_fallback',
          contexts: [],
          products: [],
          sources: [],
        }),
      },
    });

    const result = await service.answerAiSupportQuestion({
      message: 'Tìm camera cũ dưới 5 triệu',
    });

    assert.equal(result.mode, 'product_search_no_match');
    assert.deepEqual(result.products, []);
    assert.equal(providerCalled, false);
    assert.match(result.answer, /chưa có sản phẩm/i);
    assert.doesNotMatch(result.answer, /\/products\//i);
  } finally {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalApiKey;
  }
});
