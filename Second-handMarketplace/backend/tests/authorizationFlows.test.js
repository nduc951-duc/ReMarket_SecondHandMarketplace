const assert = require('node:assert/strict');
const test = require('node:test');

const { requireAdmin, requireAdminOrAgent } = require('../src/middlewares/adminMiddleware');
const { createInMemorySupabase } = require('./helpers/inMemorySupabase');
const { createResponse } = require('./helpers/httpMocks');
const { loadWithMocks } = require('./helpers/loadWithMocks');

const envModulePath = require.resolve('../src/config/env');
const testSupabaseEnv = {
  SUPABASE_URL: 'http://supabase.test',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};

test('customer cannot access admin-only action', () => {
  const res = createResponse();
  let nextCalled = false;

  requireAdmin({ user: { user_metadata: { role: 'customer' } } }, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('customer cannot access admin-or-agent area', () => {
  const res = createResponse();

  requireAdminOrAgent({ user: { user_metadata: { role: 'customer' } } }, res, () =>
    assert.fail('customer must not pass'),
  );

  assert.equal(res.statusCode, 403);
});

test('agent can access read-oriented admin area', () => {
  const res = createResponse();
  let nextCalled = false;

  requireAdminOrAgent({ user: { user_metadata: { role: 'agent' } } }, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('agent cannot perform admin-only mutation', () => {
  const res = createResponse();

  requireAdmin({ user: { user_metadata: { role: 'agent' } } }, res, () =>
    assert.fail('agent must not pass admin-only guard'),
  );

  assert.equal(res.statusCode, 403);
});

test('admin can perform admin-only mutation', () => {
  const res = createResponse();
  let nextCalled = false;

  requireAdmin({ user: { app_metadata: { role: 'admin' } } }, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('payment refund route requires authentication and admin role', () => {
  const router = require('../src/routes/paymentRoutes');
  const refundLayer = router.stack.find((layer) => layer.route?.path === '/refund');
  const handlers = refundLayer.route.stack.map((layer) => layer.handle.name);

  assert.deepEqual(handlers, [
    'requireAuth',
    'requireAdmin',
    'requireDemoWriteAccess',
    'validateRequestMiddleware',
    'refundPaymentHandler',
  ]);
});

test('payment creation requires authentication before validation', () => {
  const router = require('../src/routes/paymentRoutes');
  const createLayer = router.stack.find((layer) => layer.route?.path === '/create');
  const handlers = createLayer.route.stack.map((layer) => layer.handle.name);

  assert.deepEqual(handlers, ['requireAuth', 'validateRequestMiddleware', 'createPaymentHandler']);
});

test('seller cannot update another seller product', async () => {
  const memory = createInMemorySupabase({
    products: [{ id: 'product-1', seller_id: 'seller-a', title: 'Original title' }],
  });
  const model = loadWithMocks(require.resolve('../src/models/products/productModel'), {
    [envModulePath]: testSupabaseEnv,
    [require.resolve('@supabase/supabase-js')]: {
      createClient: () => memory.client,
    },
  });

  await assert.rejects(() =>
    model.updateProduct('product-1', 'seller-b', { title: 'Stolen update' }),
  );
  assert.equal(memory.database.tables.products[0].title, 'Original title');
});

test('nonparticipant cannot read conversation messages', async () => {
  const memory = createInMemorySupabase({
    conversation_participants: [
      { conversation_id: 'conversation-1', user_id: 'buyer-a' },
      { conversation_id: 'conversation-1', user_id: 'seller' },
    ],
  });
  const service = loadWithMocks(require.resolve('../src/services/chatService'), {
    [envModulePath]: testSupabaseEnv,
    [require.resolve('@supabase/supabase-js')]: {
      createClient: () => memory.client,
    },
    [require.resolve('../src/services/notificationService')]: {
      createNotification: async () => null,
      markConversationNotificationsAsRead: async () => null,
    },
  });

  await assert.rejects(
    () => service.getMessages('outsider', 'conversation-1'),
    (error) => error.statusCode === 403,
  );
});

test('seller cannot review their own completed sale', async () => {
  const memory = createInMemorySupabase({
    transactions: [
      {
        id: 'transaction-1',
        buyer_id: 'buyer-a',
        seller_id: 'seller',
        status: 'completed',
        product_id: 'product-1',
        product_name: 'Camera',
      },
    ],
    reviews: [],
  });
  const service = loadWithMocks(require.resolve('../src/services/reviewService'), {
    [envModulePath]: testSupabaseEnv,
    [require.resolve('@supabase/supabase-js')]: {
      createClient: () => memory.client,
    },
    [require.resolve('../src/services/notificationService')]: {
      createNotification: async () => null,
    },
  });

  await assert.rejects(
    () =>
      service.createReview({
        reviewerId: 'seller',
        transactionId: 'transaction-1',
        rating: 5,
        comment: 'Self review',
      }),
    (error) => error.statusCode === 403,
  );
});

test('transaction controller rejects seller buying own product', async () => {
  const controller = loadWithMocks(require.resolve('../src/controllers/transactionController'), {
    [require.resolve('../src/services/transactionService')]: {
      createTransaction: async () => assert.fail('must not create transaction'),
    },
    [require.resolve('../src/models/products/productModel')]: {
      getProductById: async () => ({
        id: 'product-1',
        seller_id: 'seller',
        status: 'active',
      }),
    },
  });
  const res = createResponse();

  await controller.createTransactionHandler(
    {
      body: { product_id: 'product-1' },
      user: { id: 'seller' },
    },
    res,
  );

  assert.equal(res.statusCode, 400);
});

test('transaction controller rejects sold product', async () => {
  const controller = loadWithMocks(require.resolve('../src/controllers/transactionController'), {
    [require.resolve('../src/services/transactionService')]: {
      createTransaction: async () => assert.fail('must not create transaction'),
    },
    [require.resolve('../src/models/products/productModel')]: {
      getProductById: async () => ({
        id: 'product-1',
        seller_id: 'seller',
        status: 'sold',
      }),
    },
  });
  const res = createResponse();

  await controller.createTransactionHandler(
    {
      body: { product_id: 'product-1' },
      user: { id: 'buyer-a' },
    },
    res,
  );

  assert.equal(res.statusCode, 400);
});
