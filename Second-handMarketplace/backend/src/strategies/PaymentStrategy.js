class PaymentStrategy {
  constructor(config) {
    this.config = config;
  }

  get method() {
    throw new Error('Payment strategy must define method.');
  }

  async createPayment() {
    throw new Error('createPayment must be implemented.');
  }

  verifyReturn() {
    throw new Error('verifyReturn must be implemented.');
  }

  verifyIpn() {
    throw new Error('verifyIpn must be implemented.');
  }

  async queryStatus() {
    throw new Error('queryStatus must be implemented.');
  }

  async refund() {
    throw new Error('Refund is not implemented for this payment gateway.');
  }
}

module.exports = PaymentStrategy;
