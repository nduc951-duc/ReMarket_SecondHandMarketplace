const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  buildRawSignatureString,
  buildVnpayHashData,
  buildVnpayQuery,
  createHmacSignature,
  sortObject,
  verifyHmacSignature,
} = require('../src/utils/signature');

test('sortObject removes empty values and sorts keys alphabetically', () => {
  assert.deepEqual(
    sortObject({
      z: 'last',
      empty: '',
      b: 'second',
      nil: null,
      a: 'first',
      missing: undefined,
    }),
    {
      a: 'first',
      b: 'second',
      z: 'last',
    },
  );
});

test('buildRawSignatureString creates stable gateway signature data', () => {
  assert.equal(
    buildRawSignatureString({
      orderId: 'ORD-100',
      amount: 250000,
      requestId: 'REQ-1',
    }),
    'amount=250000&orderId=ORD-100&requestId=REQ-1',
  );
});

test('buildVnpayHashData and buildVnpayQuery encode values consistently', () => {
  const payload = {
    vnp_OrderInfo: 'Thanh toan don hang',
    vnp_Amount: 25000000,
  };

  assert.equal(
    buildVnpayHashData(payload),
    'vnp_Amount=25000000&vnp_OrderInfo=Thanh+toan+don+hang',
  );

  assert.equal(
    buildVnpayQuery(payload),
    'vnp_Amount=25000000&vnp_OrderInfo=Thanh+toan+don+hang',
  );
});

test('createHmacSignature and verifyHmacSignature validate payment signatures', () => {
  const rawData = 'amount=250000&orderId=ORD-100&requestId=REQ-1';
  const secret = 'test-secret';
  const expected = crypto.createHmac('sha256', secret).update(rawData, 'utf8').digest('hex');

  assert.equal(createHmacSignature(rawData, secret), expected);
  assert.equal(verifyHmacSignature(rawData, expected, secret), true);
  assert.equal(verifyHmacSignature(rawData, 'bad-signature', secret), false);
});
