const assert = require('node:assert/strict');
const test = require('node:test');

const { createResponse } = require('./helpers/httpMocks');
const { loadWithMocks } = require('./helpers/loadWithMocks');

function createHarness(resultOrError, options = {}) {
  const calls = {
    paid: [],
    failed: [],
    callbackAttempts: [],
    gatewayUpdates: [],
    refunds: 0,
  };
  const processedKeys = new Set();
  const context = {
    verifyIpn() {
      if (resultOrError instanceof Error) {
        throw resultOrError;
      }
      return structuredClone(resultOrError);
    },
    verifyReturn() {
      if (resultOrError instanceof Error) {
        throw resultOrError;
      }
      return structuredClone(resultOrError);
    },
    async refund() {
      calls.refunds += 1;
      if (calls.refunds > 1) {
        throw new Error('Refund already processed');
      }
      return { status: 'refunded' };
    },
  };
  const controller = loadWithMocks(require.resolve('../src/controllers/paymentController'), {
    [require.resolve('../src/contexts/PaymentContext')]: {
      create: () => context,
    },
    [require.resolve('../src/services/paymentStore')]: {
      getPayment: () => null,
      updatePaymentFromGateway: (method, raw) => {
        calls.gatewayUpdates.push({ method, raw });
      },
      upsertPayment: () => null,
    },
    [require.resolve('../src/services/paymentCallbackService')]: {
      sanitizeGatewayPayload: (payload) => payload,
      processVerifiedPaymentCallback: async (method, result) => {
        calls.callbackAttempts.push({ method, result });
        const key = `${method}:${result.orderId}:${result.gatewayTransactionId}:${result.status}`;

        if (processedKeys.has(key)) {
          return { processed: false, replayed: true, outcome: 'processed' };
        }

        if (options.callbackResult) {
          return options.callbackResult;
        }

        processedKeys.add(key);
        if (result.status === 'success') {
          calls.paid.push(result);
        } else {
          calls.failed.push(result);
        }
        return { processed: true, replayed: false, outcome: 'processed' };
      },
    },
    [require.resolve('../src/services/transactionService')]: {
      expireUnpaidTransactions: async () => 0,
      markTransactionPaymentCreated: async () => null,
      prepareTransactionPayment: async () => null,
    },
  });
  return { calls, controller };
}

function ipnRequest(method = 'momo') {
  return {
    params: { method },
    query: {},
    body: { orderId: 'transaction-1' },
  };
}

test('invalid webhook signature does not mutate payment state', async () => {
  const { calls, controller } = createHarness({
    isValid: false,
    status: 'success',
    orderId: 'transaction-1',
    raw: {},
    responsePayload: { resultCode: 1 },
  });
  const res = createResponse();

  await controller.paymentIpnHandler(ipnRequest(), res);

  assert.equal(calls.gatewayUpdates.length, 0);
  assert.equal(calls.paid.length, 0);
  assert.equal(calls.failed.length, 0);
});

test('valid successful webhook marks transaction paid', async () => {
  const { calls, controller } = createHarness({
    isValid: true,
    status: 'success',
    orderId: 'transaction-1',
    amount: 1000000,
    gatewayTransactionId: 'gateway-1',
    responseCode: 0,
    raw: { amount: 1000000 },
    responsePayload: { resultCode: 0 },
  });
  const res = createResponse();

  await controller.paymentIpnHandler(ipnRequest(), res);

  assert.equal(calls.gatewayUpdates.length, 1);
  assert.equal(calls.paid[0].orderId, 'transaction-1');
  assert.equal(calls.paid[0].gatewayTransactionId, 'gateway-1');
});

test('valid failed webhook cancels awaiting payment transaction', async () => {
  const { calls, controller } = createHarness({
    isValid: true,
    status: 'failed',
    orderId: 'transaction-1',
    gatewayTransactionId: 'gateway-1',
    responseCode: 1006,
    raw: {},
    responsePayload: { resultCode: 0 },
  });
  const res = createResponse();

  await controller.paymentIpnHandler(ipnRequest(), res);

  assert.equal(calls.failed.length, 1);
  assert.equal(calls.failed[0].status, 'failed');
  assert.equal(calls.paid.length, 0);
});

test('five duplicate successful webhooks produce one logical payment update', async () => {
  const result = {
    isValid: true,
    status: 'success',
    orderId: 'transaction-1',
    amount: 1000000,
    gatewayTransactionId: 'gateway-1',
    responseCode: 0,
    raw: {},
    responsePayload: { resultCode: 0 },
  };
  const { calls, controller } = createHarness(result);

  await Promise.all(
    Array.from({ length: 5 }, () => controller.paymentIpnHandler(ipnRequest(), createResponse())),
  );

  assert.equal(calls.callbackAttempts.length, 5);
  assert.equal(calls.paid.length, 1);
});

test('late callback is recorded without reviving the transaction', async () => {
  const result = {
    isValid: true,
    status: 'success',
    orderId: 'transaction-1',
    amount: 1000000,
    raw: {},
    responsePayload: { resultCode: 0 },
  };
  const { calls, controller } = createHarness(result, {
    callbackResult: { processed: false, replayed: false, outcome: 'expired' },
  });
  const res = createResponse();

  await controller.paymentIpnHandler(ipnRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(calls.paid.length, 0);
});

test('invalid return signature reports ok false', async () => {
  const { controller } = createHarness({
    isValid: false,
    status: 'success',
    raw: {},
  });
  const res = createResponse();

  await controller.paymentReturnHandler(ipnRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, false);
});

test('VNPAY webhook exceptions return gateway-compatible error payload', async () => {
  const { controller } = createHarness(new Error('bad payload'));
  const res = createResponse();

  await controller.paymentIpnHandler(ipnRequest('vnpay'), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.RspCode, '99');
});

test('second refund attempt is rejected', async () => {
  const { controller } = createHarness({});
  const request = { body: { paymentMethod: 'momo', orderId: 'transaction-1' } };
  const first = createResponse();
  const second = createResponse();

  await controller.refundPaymentHandler(request, first);
  await controller.refundPaymentHandler(request, second);

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 501);
});
