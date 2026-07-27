const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { createResponse } = require('./helpers/httpMocks');
const { createInMemorySupabase } = require('./helpers/inMemorySupabase');
const { loadWithMocks } = require('./helpers/loadWithMocks');

const migrationPath = path.join(__dirname, '..', 'supabase_database_hardening.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');

test('database hardening migration enforces marketplace constraints', () => {
  assert.match(migration, /CHECK \(price > 0\)/);
  assert.match(migration, /CHECK \(rating BETWEEN 1 AND 5\)/);
  assert.match(migration, /ON public\.wishlists \(user_id, product_id\)/);
  assert.match(migration, /ON public\.reviews \(transaction_id, reviewer_id\)/);
  assert.match(migration, /CHECK \(buyer_id <> seller_id\)/);
  assert.match(migration, /CHECK \(reviewer_id <> reviewed_user_id\)/);
});

test('database hardening enables RLS on every application table', () => {
  const tables = [
    'profiles',
    'transactions',
    'products',
    'conversations',
    'conversation_participants',
    'chat_messages',
    'reviews',
    'product_reviews',
    'product_views',
    'wishlists',
    'notifications',
    'payment_callback_events',
    'transaction_status_audit_log',
  ];

  for (const table of tables) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`));
  }

  assert.match(migration, /to_regclass\('public\.categories'\)/);
  assert.match(migration, /ALTER TABLE public\.categories ENABLE ROW LEVEL SECURITY;/);
});

test('database hardening makes browser business tables read-only', () => {
  assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE[\s\S]+FROM anon, authenticated;/);
  assert.doesNotMatch(migration, /GRANT (?:INSERT|UPDATE|DELETE)[\s\S]+TO (?:anon|authenticated)/);
  assert.match(migration, /DROP POLICY IF EXISTS "Users can update own profile"/);
  assert.match(migration, /DROP POLICY IF EXISTS "Users can update own products"/);
  assert.match(migration, /DROP POLICY IF EXISTS "Users can insert own wishlist"/);
});

test('product creation ignores caller-supplied seller identity', async () => {
  let insertedProduct;
  const controller = loadWithMocks(require.resolve('../src/controllers/productController'), {
    [require.resolve('../src/models/products/productModel')]: {
      createProduct: async (payload) => {
        insertedProduct = payload;
        return payload;
      },
      getPublicProductById: async () => null,
      getPublicProducts: async () => [],
      updateProduct: async () => null,
      deleteProduct: async () => null,
      getProductsBySeller: async () => [],
      getPublicProductsBySeller: async () => [],
      hasOpenTransactionsForProduct: async () => false,
      incrementProductViewCount: async () => null,
      autocompleteProducts: async () => [],
    },
  });
  const res = createResponse();

  await controller.createProductHandler(
    {
      user: { id: 'token-user' },
      body: {
        seller_id: 'spoofed-user',
        title: 'A legitimate marketplace listing',
        price: 100000,
        category: 'electronics',
        image_url: '/uploads/item.jpg',
      },
    },
    res,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(insertedProduct.seller_id, 'token-user');
});

test('transaction creation derives buyer and seller instead of trusting request body', async () => {
  let insertedTransaction;
  const controller = loadWithMocks(require.resolve('../src/controllers/transactionController'), {
    [require.resolve('../src/services/transactionService')]: {
      createTransaction: async (payload) => {
        insertedTransaction = payload;
        return payload;
      },
    },
    [require.resolve('../src/models/products/productModel')]: {
      getProductById: async () => ({
        id: 'product-1',
        seller_id: 'database-seller',
        title: 'Camera',
        price: 250000,
        status: 'active',
        images: [],
      }),
    },
  });
  const res = createResponse();

  await controller.createTransactionHandler(
    {
      user: { id: 'token-buyer' },
      body: {
        product_id: 'product-1',
        buyer_id: 'spoofed-buyer',
        seller_id: 'spoofed-seller',
      },
    },
    res,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(insertedTransaction.buyer_id, 'token-buyer');
  assert.equal(insertedTransaction.seller_id, 'database-seller');
});

test('review and wishlist mutations derive user identity from access token', async () => {
  let reviewInput;
  const reviewController = loadWithMocks(require.resolve('../src/controllers/reviewController'), {
    [require.resolve('../src/services/reviewService')]: {
      createReview: async (payload) => {
        reviewInput = payload;
        return payload;
      },
      getReviewsByUser: async () => [],
      getReviewForTransaction: async () => null,
      getMyReviews: async () => [],
    },
  });
  const reviewResponse = createResponse();

  await reviewController.createReviewHandler(
    {
      user: { id: 'token-reviewer' },
      body: {
        transaction_id: 'transaction-1',
        reviewer_id: 'spoofed-reviewer',
        rating: 5,
      },
    },
    reviewResponse,
  );

  let wishlistUserId;
  const wishlistController = loadWithMocks(
    require.resolve('../src/controllers/wishlistController'),
    {
      [require.resolve('../src/services/wishlistService')]: {
        getWishlist: async () => [],
        getWishlistStatus: async () => false,
        toggleWishlist: async (userId) => {
          wishlistUserId = userId;
          return { wishlisted: true };
        },
      },
    },
  );
  const wishlistResponse = createResponse();

  await wishlistController.toggleWishlistHandler(
    {
      user: { id: 'token-wishlist-user' },
      body: { product_id: 'product-1', user_id: 'spoofed-user' },
    },
    wishlistResponse,
  );

  assert.equal(reviewResponse.statusCode, 201);
  assert.equal(reviewInput.reviewerId, 'token-reviewer');
  assert.equal(wishlistResponse.statusCode, 200);
  assert.equal(wishlistUserId, 'token-wishlist-user');
});

test('concurrent wishlist inserts are idempotent at the unique constraint', async () => {
  process.env.SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  const memory = createInMemorySupabase({
    products: [
      {
        id: 'product-1',
        seller_id: 'seller',
        status: 'active',
        title: 'Camera',
      },
    ],
    wishlists: [],
  });
  const service = loadWithMocks(require.resolve('../src/services/wishlistService'), {
    [require.resolve('@supabase/supabase-js')]: {
      createClient: () => memory.client,
    },
  });

  const results = await Promise.all([
    service.toggleWishlist('buyer', 'product-1'),
    service.toggleWishlist('buyer', 'product-1'),
  ]);

  assert.equal(memory.database.tables.wishlists.length, 1);
  assert.deepEqual(
    results.map((result) => result.wishlisted),
    [true, true],
  );
});

test('concurrent reviews return conflict instead of creating duplicates', async () => {
  process.env.SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  const memory = createInMemorySupabase({
    transactions: [
      {
        id: 'transaction-1',
        buyer_id: 'buyer',
        seller_id: 'seller',
        status: 'completed',
        product_id: 'product-1',
        product_name: 'Camera',
      },
    ],
    reviews: [],
  });
  const service = loadWithMocks(require.resolve('../src/services/reviewService'), {
    [require.resolve('@supabase/supabase-js')]: {
      createClient: () => memory.client,
    },
    [require.resolve('../src/services/notificationService')]: {
      createNotification: async () => null,
    },
  });

  const results = await Promise.allSettled([
    service.createReview({
      reviewerId: 'buyer',
      transactionId: 'transaction-1',
      rating: 5,
    }),
    service.createReview({
      reviewerId: 'buyer',
      transactionId: 'transaction-1',
      rating: 5,
    }),
  ]);

  assert.equal(memory.database.tables.reviews.length, 1);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.equal(rejected.reason.statusCode, 409);
});
