const PaymentStrategy = require('./PaymentStrategy');
const { createHmacSignature, verifyHmacSignature } = require('../utils/signature');

function requireConfig(config) {
  const missing = ['partnerCode', 'accessKey', 'secretKey'].filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Thieu cau hinh MoMo: ${missing.join(', ')}.`);
  }
}

function createRequestId(orderId) {
  return `${orderId}-${Date.now()}`;
}

class MomoStrategy extends PaymentStrategy {
  get method() {
    return 'momo';
  }

  buildCreateSignaturePayload(payload) {
    return [
      `accessKey=${this.config.accessKey}`,
      `amount=${payload.amount}`,
      `extraData=${payload.extraData}`,
      `ipnUrl=${payload.ipnUrl}`,
      `orderId=${payload.orderId}`,
      `orderInfo=${payload.orderInfo}`,
      `partnerCode=${payload.partnerCode}`,
      `redirectUrl=${payload.redirectUrl}`,
      `requestId=${payload.requestId}`,
      `requestType=${payload.requestType}`,
    ].join('&');
  }

  buildResultSignaturePayload(payload) {
    const fields = [
      'accessKey',
      'amount',
      'extraData',
      'message',
      'orderId',
      'orderInfo',
      'orderType',
      'partnerCode',
      'payType',
      'requestId',
      'responseTime',
      'resultCode',
      'transId',
    ];

    return fields
      .map((field) => `${field}=${field === 'accessKey' ? this.config.accessKey : payload[field] ?? ''}`)
      .join('&');
  }

  buildIpnResponseSignaturePayload(payload) {
    return [
      `accessKey=${this.config.accessKey}`,
      `extraData=${payload.extraData || ''}`,
      `message=${payload.message}`,
      `orderId=${payload.orderId}`,
      `partnerCode=${payload.partnerCode}`,
      `requestId=${payload.requestId}`,
      `responseTime=${payload.responseTime}`,
      `resultCode=${payload.resultCode}`,
    ].join('&');
  }

  async createPayment(input) {
    requireConfig(this.config);

    const requestId = input.requestId || createRequestId(input.orderId);
    const payload = {
      partnerCode: this.config.partnerCode,
      partnerName: this.config.partnerName,
      storeId: this.config.storeId,
      requestId,
      amount: Number(input.amount),
      orderId: input.orderId,
      orderInfo: input.orderInfo,
      redirectUrl: input.returnUrl,
      ipnUrl: input.notifyUrl,
      requestType: input.requestType || this.config.requestType,
      extraData: input.extraData || '',
      lang: input.lang || 'vi',
    };

    const rawSignature = this.buildCreateSignaturePayload(payload);
    payload.signature = createHmacSignature(rawSignature, this.config.secretKey, 'sha256');

    const response = await fetch(this.config.createEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || 'Khong the tao thanh toan MoMo.');
    }

    return {
      paymentMethod: this.method,
      orderId: input.orderId,
      requestId,
      paymentUrl: result.payUrl || result.deeplink || '',
      gatewayResponse: result,
      signedPayload: payload,
    };
  }

  verifyReturn(payload = {}) {
    requireConfig(this.config);
    const rawSignature = this.buildResultSignaturePayload(payload);
    const isValid = verifyHmacSignature(rawSignature, payload.signature || '', this.config.secretKey, 'sha256');

    return {
      isValid,
      status: Number(payload.resultCode) === 0 ? 'success' : 'failed',
      orderId: payload.orderId,
      gatewayTransactionId: payload.transId,
      responseCode: payload.resultCode,
      raw: payload,
    };
  }

  verifyIpn(payload = {}) {
    const result = this.verifyReturn(payload);
    const responseTime = Date.now();
    const responsePayload = {
      partnerCode: payload.partnerCode || this.config.partnerCode,
      requestId: payload.requestId,
      orderId: payload.orderId,
      resultCode: result.isValid ? 0 : 1,
      message: result.isValid ? 'Confirm Success' : 'Invalid signature',
      responseTime,
      extraData: payload.extraData || '',
    };

    responsePayload.signature = createHmacSignature(
      this.buildIpnResponseSignaturePayload(responsePayload),
      this.config.secretKey,
      'sha256',
    );

    return {
      ...result,
      responsePayload,
    };
  }

  async queryStatus({ orderId, requestId }) {
    requireConfig(this.config);

    const payload = {
      partnerCode: this.config.partnerCode,
      requestId: requestId || createRequestId(orderId),
      orderId,
      lang: 'vi',
    };
    const rawSignature = `accessKey=${this.config.accessKey}&orderId=${payload.orderId}&partnerCode=${payload.partnerCode}&requestId=${payload.requestId}`;
    payload.signature = createHmacSignature(rawSignature, this.config.secretKey, 'sha256');

    const response = await fetch(this.config.queryEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || 'Khong the truy van giao dich MoMo.');
    }

    return result;
  }
}

module.exports = MomoStrategy;
