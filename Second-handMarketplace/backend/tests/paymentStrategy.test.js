const assert = require('node:assert/strict');
const test = require('node:test');

const PaymentStrategy = require('../src/strategies/PaymentStrategy');

test('PaymentStrategy stores gateway config', () => {
  const strategy = new PaymentStrategy({ partnerCode: 'demo' });

  assert.deepEqual(strategy.config, { partnerCode: 'demo' });
});

test('PaymentStrategy abstract methods throw helpful implementation errors', async () => {
  const strategy = new PaymentStrategy({});

  assert.throws(() => strategy.method, /must define method/);
  await assert.rejects(() => strategy.createPayment(), /createPayment must be implemented/);
  assert.throws(() => strategy.verifyReturn(), /verifyReturn must be implemented/);
  assert.throws(() => strategy.verifyIpn(), /verifyIpn must be implemented/);
  await assert.rejects(() => strategy.queryStatus(), /queryStatus must be implemented/);
  await assert.rejects(() => strategy.refund(), /Refund is not implemented/);
});
