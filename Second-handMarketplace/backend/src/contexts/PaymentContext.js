const paymentConfig = require('../config/payment');
const MomoStrategy = require('../strategies/MomoStrategy');
const VnpayStrategy = require('../strategies/VnpayStrategy');

const strategyFactories = {
  momo: () => new MomoStrategy(paymentConfig.momo),
  vnpay: () => new VnpayStrategy(paymentConfig.vnpay),
};

class PaymentContext {
  constructor(strategy) {
    this.strategy = strategy;
  }

  static create(paymentMethod) {
    const normalizedMethod = String(paymentMethod || '').trim().toLowerCase();
    const factory = strategyFactories[normalizedMethod];

    if (!factory) {
      throw new Error(`Phuong thuc thanh toan khong ho tro: ${paymentMethod}.`);
    }

    return new PaymentContext(factory());
  }

  createPayment(payload) {
    return this.strategy.createPayment(payload);
  }

  verifyReturn(payload) {
    return this.strategy.verifyReturn(payload);
  }

  verifyIpn(payload) {
    return this.strategy.verifyIpn(payload);
  }

  queryStatus(payload) {
    return this.strategy.queryStatus(payload);
  }

  refund(payload) {
    return this.strategy.refund(payload);
  }
}

module.exports = PaymentContext;
