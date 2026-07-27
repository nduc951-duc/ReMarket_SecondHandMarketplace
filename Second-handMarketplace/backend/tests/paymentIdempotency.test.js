const assert = require('node:assert/strict');
const test = require('node:test');

const { createInMemorySupabase } = require('./helpers/inMemorySupabase');
const { loadWithMocks } = require('./helpers/loadWithMocks');

function createHarness(transactionOverrides = {}) {
  process.env.SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

  const memory = createInMemorySupabase({
    transactions: [
      {
        id: 'transaction-1',
        buyer_id: 'buyer-1',
        amount: 500000,
        status: 'awaiting_payment',
        payment_status: 'pending',
        payment_method: 'momo',
        payment_currency: 'VND',
        payment_expires_at: new Date(Date.now() + 60_000).toISOString(),
        payment_gateway_transaction_id: '',
        ...transactionOverrides,
      },
    ],
  });
  const transactionService = loadWithMocks(require.resolve('../src/services/transactionService'), {
    [require.resolve('@supabase/supabase-js')]: {
      createClient: () => memory.client,
    },
    [require.resolve('../src/services/notificationService')]: {
      createNotification: async () => null,
    },
  });
  const callbackService = loadWithMocks(require.resolve('../src/services/paymentCallbackService'), {
    [require.resolve('../src/services/transactionService')]: transactionService,
  });

  return { callbackService, memory, transactionService };
}

function successfulCallback(overrides = {}) {
  return {
    isValid: true,
    status: 'success',
    orderId: 'transaction-1',
    amount: 500000,
    currency: 'VND',
    gatewayTransactionId: 'momo-transaction-1',
    responseCode: 0,
    raw: {
      orderId: 'transaction-1',
      amount: 500000,
      transId: 'momo-transaction-1',
      signature: 'must-not-be-stored',
    },
    ...overrides,
  };
}

test('five identical callbacks create one event, one transition, and one audit row', async () => {
  const { callbackService, memory } = createHarness();

  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      callbackService.processVerifiedPaymentCallback('momo', successfulCallback()),
    ),
  );

  assert.equal(results.filter((result) => result.processed).length, 1);
  assert.equal(results.filter((result) => result.replayed).length, 4);
  assert.equal(memory.database.tables.payment_callback_events.length, 1);
  assert.equal(memory.database.tables.transaction_status_audit_log.length, 1);
  assert.equal(memory.database.tables.transactions[0].payment_status, 'paid');
  assert.equal(
    memory.database.tables.payment_callback_events[0].sanitized_payload.signature,
    '[REDACTED]',
  );
});

test('amount mismatch is audited as a rejected event without changing the order', async () => {
  const { callbackService, memory } = createHarness();

  const result = await callbackService.processVerifiedPaymentCallback(
    'momo',
    successfulCallback({ amount: 499999 }),
  );

  assert.equal(result.processed, false);
  assert.equal(result.outcome, 'amount_mismatch');
  assert.equal(memory.database.tables.payment_callback_events.length, 1);
  assert.equal(memory.database.tables.transaction_status_audit_log.length, 0);
  assert.equal(memory.database.tables.transactions[0].payment_status, 'pending');
});

test('currency mismatch cannot mark a transaction paid', async () => {
  const { callbackService, memory } = createHarness();

  const result = await callbackService.processVerifiedPaymentCallback(
    'momo',
    successfulCallback({ currency: 'USD' }),
  );

  assert.equal(result.outcome, 'currency_mismatch');
  assert.equal(memory.database.tables.transactions[0].status, 'awaiting_payment');
});

test('late callback cannot revive an expired transaction', async () => {
  const { callbackService, memory } = createHarness({
    payment_expires_at: new Date(Date.now() - 60_000).toISOString(),
  });

  const result = await callbackService.processVerifiedPaymentCallback('momo', successfulCallback());

  assert.equal(result.outcome, 'expired');
  assert.equal(memory.database.tables.transactions[0].payment_status, 'pending');
});

test('payment creation uses the authenticated buyer and server-side order amount', async () => {
  const { transactionService } = createHarness();

  const transaction = await transactionService.prepareTransactionPayment({
    transactionId: 'transaction-1',
    buyerId: 'buyer-1',
    paymentMethod: 'momo',
  });

  assert.equal(transaction.amount, 500000);
  await assert.rejects(
    () =>
      transactionService.prepareTransactionPayment({
        transactionId: 'transaction-1',
        buyerId: 'other-user',
        paymentMethod: 'momo',
      }),
    (error) => error.statusCode === 403,
  );
});
