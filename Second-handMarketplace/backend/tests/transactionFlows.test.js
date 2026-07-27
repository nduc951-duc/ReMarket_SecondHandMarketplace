const assert = require('node:assert/strict');
const test = require('node:test');

const { createInMemorySupabase } = require('./helpers/inMemorySupabase');
const { loadWithMocks } = require('./helpers/loadWithMocks');

const transactionServicePath = require.resolve('../src/services/transactionService');
const supabaseModulePath = require.resolve('@supabase/supabase-js');
const envModulePath = require.resolve('../src/config/env');
const notificationServicePath = require.resolve('../src/services/notificationService');

function createFixture(overrides = {}) {
  const seed = {
    profiles: [{ id: 'buyer-a' }, { id: 'buyer-b' }, { id: 'seller' }, { id: 'outsider' }],
    products: [{ id: 'product-1', seller_id: 'seller', status: 'active' }],
    transactions: [],
    ...overrides,
  };
  const memory = createInMemorySupabase(seed);
  const service = loadWithMocks(transactionServicePath, {
    [supabaseModulePath]: { createClient: () => memory.client },
    [envModulePath]: {
      SUPABASE_URL: 'http://supabase.test',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    },
    [notificationServicePath]: { createNotification: async () => null },
  });
  return { ...memory, service };
}

function order(overrides = {}) {
  return {
    buyer_id: 'buyer-a',
    seller_id: 'seller',
    product_id: 'product-1',
    product_name: 'Camera',
    amount: 1000000,
    payment_method: 'cod',
    note: '',
    ...overrides,
  };
}

function transaction(overrides = {}) {
  return {
    id: 'transaction-1',
    buyer_id: 'buyer-a',
    seller_id: 'seller',
    product_id: 'product-1',
    product_name: 'Camera',
    amount: 1000000,
    status: 'pending',
    payment_status: 'cod',
    ...overrides,
  };
}

test('COD order starts pending with COD payment state', async () => {
  const { service } = createFixture();
  const created = await service.createTransaction(order());

  assert.equal(created.status, 'pending');
  assert.equal(created.payment_status, 'cod');
  assert.equal(created.payment_expires_at, null);
});

test('online order starts awaiting payment and gets an expiry', async () => {
  const { service } = createFixture();
  const created = await service.createTransaction(order({ payment_method: 'momo' }));

  assert.equal(created.status, 'awaiting_payment');
  assert.equal(created.payment_status, 'pending');
  assert.ok(Date.parse(created.payment_expires_at) > Date.now());
});

test('existing open order rejects another buyer', async () => {
  const { service } = createFixture({
    transactions: [transaction()],
  });

  await assert.rejects(
    () => service.createTransaction(order({ buyer_id: 'buyer-b' })),
    (error) => error.statusCode === 409,
  );
});

test('two simultaneous buyers create exactly one open transaction', async () => {
  const { service, database } = createFixture();
  const results = await Promise.allSettled([
    service.createTransaction(order({ buyer_id: 'buyer-a' })),
    service.createTransaction(order({ buyer_id: 'buyer-b' })),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(database.tables.transactions.length, 1);
  assert.equal(results.find((result) => result.status === 'rejected').reason.statusCode, 409);
});

test('unrelated user cannot update a transaction', async () => {
  const { service } = createFixture({ transactions: [transaction()] });

  await assert.rejects(
    () => service.updateTransactionStatus('transaction-1', 'outsider', 'confirmed'),
    (error) => error.statusCode === 403,
  );
});

test('unknown transaction status is rejected', async () => {
  const { service } = createFixture({ transactions: [transaction()] });

  await assert.rejects(
    () => service.updateTransactionStatus('transaction-1', 'seller', 'refunded'),
    (error) => error.statusCode === 400,
  );
});

test('repeating the current status is idempotent', async () => {
  const original = transaction();
  const { service } = createFixture({ transactions: [original] });
  const result = await service.updateTransactionStatus('transaction-1', 'seller', 'pending');

  assert.deepEqual(result, original);
});

test('awaiting-payment order cannot be manually advanced', async () => {
  const { service } = createFixture({
    transactions: [transaction({ status: 'awaiting_payment', payment_status: 'pending' })],
  });

  await assert.rejects(
    () => service.updateTransactionStatus('transaction-1', 'seller', 'confirmed'),
    (error) => error.statusCode === 400,
  );
});

test('only seller can confirm a pending order', async () => {
  const { service } = createFixture({ transactions: [transaction()] });

  await assert.rejects(
    () => service.updateTransactionStatus('transaction-1', 'buyer-a', 'confirmed'),
    (error) => error.statusCode === 403,
  );
});

test('seller confirmation marks the product sold', async () => {
  const { service, database } = createFixture({ transactions: [transaction()] });
  const result = await service.updateTransactionStatus('transaction-1', 'seller', 'confirmed');

  assert.equal(result.status, 'confirmed');
  assert.equal(database.tables.products[0].status, 'sold');
});

test('confirmation requires pending state', async () => {
  const { service } = createFixture({
    transactions: [transaction({ status: 'shipped' })],
  });

  await assert.rejects(
    () => service.updateTransactionStatus('transaction-1', 'seller', 'confirmed'),
    (error) => error.statusCode === 400,
  );
});

test('only seller can ship a confirmed order', async () => {
  const { service } = createFixture({
    transactions: [transaction({ status: 'confirmed' })],
  });

  await assert.rejects(
    () => service.updateTransactionStatus('transaction-1', 'buyer-a', 'shipped'),
    (error) => error.statusCode === 403,
  );
});

test('seller can move confirmed order to shipped', async () => {
  const { service } = createFixture({
    transactions: [transaction({ status: 'confirmed' })],
  });
  const result = await service.updateTransactionStatus('transaction-1', 'seller', 'shipped');

  assert.equal(result.status, 'shipped');
  assert.ok(result.shipped_at);
});

test('only buyer can complete a shipped order', async () => {
  const { service } = createFixture({
    transactions: [transaction({ status: 'shipped' })],
  });

  await assert.rejects(
    () => service.updateTransactionStatus('transaction-1', 'seller', 'completed'),
    (error) => error.statusCode === 403,
  );
});

test('buyer can complete a shipped order', async () => {
  const { service } = createFixture({
    transactions: [transaction({ status: 'shipped' })],
  });
  const result = await service.updateTransactionStatus('transaction-1', 'buyer-a', 'completed');

  assert.equal(result.status, 'completed');
  assert.ok(result.completed_at);
});

test('completed order cannot return to pending', async () => {
  const { service } = createFixture({
    transactions: [transaction({ status: 'completed' })],
  });

  await assert.rejects(
    () => service.updateTransactionStatus('transaction-1', 'buyer-a', 'pending'),
    (error) => error.statusCode === 400,
  );
});

test('pending cancellation requires the seller', async () => {
  const { service } = createFixture({ transactions: [transaction()] });

  await assert.rejects(
    () =>
      service.updateTransactionStatus('transaction-1', 'buyer-a', 'cancelled', {
        rejection_reason: 'No stock',
      }),
    (error) => error.statusCode === 403,
  );
});

test('pending cancellation requires a rejection reason', async () => {
  const { service } = createFixture({ transactions: [transaction()] });

  await assert.rejects(
    () => service.updateTransactionStatus('transaction-1', 'seller', 'cancelled'),
    (error) => error.statusCode === 400,
  );
});

test('cancelling a confirmed order reactivates its product', async () => {
  const { service, database } = createFixture({
    products: [{ id: 'product-1', seller_id: 'seller', status: 'sold' }],
    transactions: [transaction({ status: 'confirmed' })],
  });
  const result = await service.updateTransactionStatus('transaction-1', 'buyer-a', 'cancelled');

  assert.equal(result.status, 'cancelled');
  assert.equal(database.tables.products[0].status, 'active');
});

test('completed order cannot be cancelled', async () => {
  const { service } = createFixture({
    transactions: [transaction({ status: 'completed' })],
  });

  await assert.rejects(
    () => service.updateTransactionStatus('transaction-1', 'buyer-a', 'cancelled'),
    (error) => error.statusCode === 400,
  );
});

test('verified payment moves awaiting order to paid and pending', async () => {
  const { service } = createFixture({
    transactions: [
      transaction({
        status: 'awaiting_payment',
        payment_status: 'pending',
        payment_method: 'momo',
      }),
    ],
  });
  const result = await service.markTransactionPaymentPaid({
    transactionId: 'transaction-1',
    paymentMethod: 'momo',
    gatewayTransactionId: 'gateway-1',
    responseCode: '0',
    paidAmount: 1000000,
  });

  assert.equal(result.status, 'pending');
  assert.equal(result.payment_status, 'paid');
  assert.equal(result.payment_gateway_transaction_id, 'gateway-1');
});

test('replayed successful payment is idempotent', async () => {
  const paid = transaction({
    status: 'pending',
    payment_status: 'paid',
    payment_gateway_transaction_id: 'gateway-1',
  });
  const { service, database } = createFixture({ transactions: [paid] });

  const first = await service.markTransactionPaymentPaid({
    transactionId: 'transaction-1',
    paymentMethod: 'momo',
    gatewayTransactionId: 'gateway-1',
    paidAmount: 1000000,
  });
  const second = await service.markTransactionPaymentPaid({
    transactionId: 'transaction-1',
    paymentMethod: 'momo',
    gatewayTransactionId: 'gateway-1',
    paidAmount: 1000000,
  });

  assert.equal(first.payment_status, 'paid');
  assert.deepEqual(second, first);
  assert.equal(database.tables.transactions.length, 1);
});

test('late successful callback cannot revive cancelled order', async () => {
  const { service } = createFixture({
    transactions: [transaction({ status: 'cancelled', payment_status: 'expired' })],
  });

  await assert.rejects(
    () =>
      service.markTransactionPaymentPaid({
        transactionId: 'transaction-1',
        paymentMethod: 'momo',
        gatewayTransactionId: 'gateway-late',
        paidAmount: 1000000,
      }),
    (error) => error.statusCode === 409,
  );
});

test('callback amount must equal transaction amount', async () => {
  const { service, database } = createFixture({
    transactions: [transaction({ status: 'awaiting_payment', payment_status: 'pending' })],
  });

  await assert.rejects(
    () =>
      service.markTransactionPaymentPaid({
        transactionId: 'transaction-1',
        paymentMethod: 'momo',
        gatewayTransactionId: 'gateway-1',
        paidAmount: 999999,
      }),
    (error) => error.statusCode === 409,
  );
  assert.equal(database.tables.transactions[0].payment_status, 'pending');
});

test('successful callback without an amount is rejected', async () => {
  const { service } = createFixture({
    transactions: [transaction({ status: 'awaiting_payment', payment_status: 'pending' })],
  });

  await assert.rejects(
    () =>
      service.markTransactionPaymentPaid({
        transactionId: 'transaction-1',
        paymentMethod: 'momo',
        gatewayTransactionId: 'gateway-1',
      }),
    (error) => error.statusCode === 409,
  );
});

test('gateway transaction ID cannot be used by another order', async () => {
  const { service } = createFixture({
    products: [
      { id: 'product-1', seller_id: 'seller', status: 'active' },
      { id: 'product-2', seller_id: 'seller', status: 'active' },
    ],
    transactions: [
      transaction({
        payment_status: 'paid',
        payment_gateway_transaction_id: 'gateway-1',
      }),
      transaction({
        id: 'transaction-2',
        product_id: 'product-2',
        status: 'awaiting_payment',
        payment_status: 'pending',
      }),
    ],
  });

  await assert.rejects(
    () =>
      service.markTransactionPaymentPaid({
        transactionId: 'transaction-2',
        paymentMethod: 'momo',
        gatewayTransactionId: 'gateway-1',
        paidAmount: 1000000,
      }),
    (error) => error.statusCode === 409,
  );
});

test('failed callback cancels only awaiting-payment order', async () => {
  const { service } = createFixture({
    transactions: [transaction({ status: 'awaiting_payment', payment_status: 'pending' })],
  });
  const result = await service.markTransactionPaymentFailed({
    transactionId: 'transaction-1',
    paymentMethod: 'momo',
  });

  assert.equal(result.status, 'cancelled');
  assert.equal(result.payment_status, 'failed');
});

test('expiry cancels only overdue pending online orders', async () => {
  const { service, database } = createFixture({
    transactions: [
      transaction({
        status: 'awaiting_payment',
        payment_status: 'pending',
        payment_expires_at: '2020-01-01T00:00:00.000Z',
      }),
      transaction({
        id: 'transaction-2',
        product_id: 'product-2',
        status: 'awaiting_payment',
        payment_status: 'pending',
        payment_expires_at: '2999-01-01T00:00:00.000Z',
      }),
    ],
  });
  const count = await service.expireUnpaidTransactions();

  assert.equal(count, 1);
  assert.equal(database.tables.transactions[0].payment_status, 'expired');
  assert.equal(database.tables.transactions[1].payment_status, 'pending');
});
