const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { createInMemorySupabase } = require('./helpers/inMemorySupabase');
const { createResponse } = require('./helpers/httpMocks');
const { loadWithMocks } = require('./helpers/loadWithMocks');

const envModulePath = require.resolve('../src/config/env');
const testSupabaseEnv = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
};

test('seller follow migration prevents duplicates and self-follow', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase_seller_follows.sql'), 'utf8');

  assert.match(sql, /PRIMARY KEY \(follower_id, seller_id\)/i);
  assert.match(sql, /CHECK \(follower_id <> seller_id\)/i);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE[\s\S]*anon, authenticated/i);
});

test('a user can follow and unfollow a seller idempotently', async () => {
  const memory = createInMemorySupabase({ seller_follows: [] });
  const service = loadWithMocks(require.resolve('../src/services/followService'), {
    [envModulePath]: testSupabaseEnv,
    [require.resolve('@supabase/supabase-js')]: { createClient: () => memory.client },
    [require.resolve('../src/services/notificationService')]: {
      createNotification: async () => null,
    },
  });

  assert.deepEqual(await service.toggleSellerFollow('buyer', 'seller'), { following: true });
  assert.equal(await service.getSellerFollowStatus('buyer', 'seller'), true);
  assert.deepEqual(await service.toggleSellerFollow('buyer', 'seller'), { following: false });
  assert.equal(await service.getSellerFollowStatus('buyer', 'seller'), false);
  await assert.rejects(
    () => service.toggleSellerFollow('seller', 'seller'),
    (error) => error.statusCode === 400,
  );
});

test('price change creates one product notification per seller follower', async () => {
  const memory = createInMemorySupabase({
    seller_follows: [
      { follower_id: 'buyer-a', seller_id: 'seller' },
      { follower_id: 'buyer-b', seller_id: 'seller' },
      { follower_id: 'buyer-c', seller_id: 'other-seller' },
    ],
  });
  const notifications = [];
  const service = loadWithMocks(require.resolve('../src/services/followService'), {
    [envModulePath]: testSupabaseEnv,
    [require.resolve('@supabase/supabase-js')]: { createClient: () => memory.client },
    [require.resolve('../src/services/notificationService')]: {
      createNotification: async (payload) => notifications.push(payload),
    },
  });

  const count = await service.notifySellerFollowersOfPriceChange({
    sellerId: 'seller',
    product: { id: 'product-1', title: 'Máy ảnh cũ' },
    oldPrice: 5_000_000,
    newPrice: 4_500_000,
  });

  assert.equal(count, 2);
  assert.deepEqual(
    notifications.map((item) => item.user_id),
    ['buyer-a', 'buyer-b'],
  );
  assert.equal(notifications[0].type, 'product_price_changed');
  assert.equal(notifications[0].entity_id, 'product-1');
});

test('product update notifies followers only when the price changes', async () => {
  const notifications = [];
  const controller = loadWithMocks(require.resolve('../src/controllers/productController'), {
    [require.resolve('../src/models/products/productModel')]: {
      getProductById: async () => ({
        id: 'product-1',
        seller_id: 'seller',
        title: 'Máy ảnh cũ',
        price: 5_000_000,
      }),
      hasOpenTransactionsForProduct: async () => false,
      updateProduct: async (_id, _sellerId, update) => ({
        id: 'product-1',
        seller_id: 'seller',
        title: 'Máy ảnh cũ',
        price: update.price,
      }),
    },
    [require.resolve('../src/services/followService')]: {
      notifySellerFollowersOfPriceChange: async (payload) => notifications.push(payload),
    },
  });
  const response = createResponse();

  await controller.updateProductHandler(
    { params: { id: 'product-1' }, user: { id: 'seller' }, body: { price: 4_500_000 } },
    response,
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(response.statusCode, 200);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].oldPrice, 5_000_000);
  assert.equal(notifications[0].newPrice, 4_500_000);
});
