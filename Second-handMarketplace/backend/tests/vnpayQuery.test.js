const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const VnpayStrategy = require('../src/strategies/VnpayStrategy');

const config = {
  tmnCode: 'TESTCODE',
  hashSecret: 'test-secret',
  queryEndpoint: 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
  version: '2.1.0',
};

function signResponse(payload) {
  const fields = [
    'vnp_ResponseId',
    'vnp_Command',
    'vnp_ResponseCode',
    'vnp_Message',
    'vnp_TmnCode',
    'vnp_TxnRef',
    'vnp_Amount',
    'vnp_BankCode',
    'vnp_PayDate',
    'vnp_TransactionNo',
    'vnp_TransactionType',
    'vnp_TransactionStatus',
    'vnp_OrderInfo',
    'vnp_PromotionCode',
    'vnp_PromotionAmount',
  ];
  const data = fields.map((field) => payload[field] ?? '').join('|');
  return crypto.createHmac('sha512', config.hashSecret).update(data, 'utf8').digest('hex');
}

test('VNPAY querydr posts the documented payload and verifies the response', async (t) => {
  let request;
  t.mock.method(global, 'fetch', async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    const responsePayload = {
      vnp_ResponseId: 'response-1',
      vnp_Command: 'querydr',
      vnp_ResponseCode: '00',
      vnp_Message: 'Success',
      vnp_TmnCode: config.tmnCode,
      vnp_TxnRef: 'order-1',
      vnp_Amount: '45000000',
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20260804133153',
      vnp_TransactionNo: '12345678',
      vnp_TransactionType: '01',
      vnp_TransactionStatus: '00',
      vnp_OrderInfo: 'Thanh toan order-1',
    };
    responsePayload.vnp_SecureHash = signResponse(responsePayload);
    return { ok: true, json: async () => responsePayload };
  });

  const result = await new VnpayStrategy(config).queryStatus({
    orderId: 'order-1',
    requestId: 'request-1',
    transactionDate: '20260804130000',
    orderInfo: 'Thanh toan order-1',
    ipAddress: '127.0.0.1',
  });

  assert.equal(request.url, config.queryEndpoint);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.body.vnp_Command, 'querydr');
  assert.equal(request.body.vnp_TransactionDate, '20260804130000');
  assert.match(request.body.vnp_SecureHash, /^[a-f0-9]{128}$/);
  assert.equal(result.isValid, true);
});

test('VNPAY querydr rejects a response with an invalid signature', async (t) => {
  t.mock.method(global, 'fetch', async () => ({
    ok: true,
    json: async () => ({ vnp_SecureHash: 'invalid' }),
  }));

  await assert.rejects(
    () =>
      new VnpayStrategy(config).queryStatus({
        orderId: 'order-1',
        transactionDate: '20260804130000',
      }),
    /Chu ky phan hoi truy van VNPAY khong hop le/,
  );
});
