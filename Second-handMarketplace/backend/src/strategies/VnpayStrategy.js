const PaymentStrategy = require('./PaymentStrategy');
const {
  buildVnpayHashData,
  buildVnpayQuery,
  createHmacSignature,
  sortObject,
  verifyHmacSignature,
} = require('../utils/signature');

function requireConfig(config) {
  const missing = ['tmnCode', 'hashSecret'].filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Thieu cau hinh VNPAY: ${missing.join(', ')}.`);
  }
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatVnpayDate(date = new Date()) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const vietnamDate = new Date(utc + 7 * 60 * 60 * 1000);

  return [
    vietnamDate.getFullYear(),
    pad(vietnamDate.getMonth() + 1),
    pad(vietnamDate.getDate()),
    pad(vietnamDate.getHours()),
    pad(vietnamDate.getMinutes()),
    pad(vietnamDate.getSeconds()),
  ].join('');
}

function getClientIp(input = {}) {
  return input.ipAddress || input.ip || '127.0.0.1';
}

class VnpayStrategy extends PaymentStrategy {
  get method() {
    return 'vnpay';
  }

  createSecureHash(payload) {
    const hashData = buildVnpayHashData(payload);
    return createHmacSignature(hashData, this.config.hashSecret, 'sha512');
  }

  sanitizeReturnPayload(payload = {}) {
    const nextPayload = { ...payload };
    delete nextPayload.vnp_SecureHash;
    delete nextPayload.vnp_SecureHashType;
    return sortObject(nextPayload);
  }

  async createPayment(input) {
    requireConfig(this.config);

    const createDate = formatVnpayDate();
    const expireDate = formatVnpayDate(new Date(Date.now() + 15 * 60 * 1000));
    const payload = {
      vnp_Version: this.config.version,
      vnp_Command: 'pay',
      vnp_TmnCode: this.config.tmnCode,
      vnp_Amount: Number(input.amount) * 100,
      vnp_CurrCode: this.config.currCode,
      vnp_TxnRef: input.orderId,
      vnp_OrderInfo: input.orderInfo,
      vnp_OrderType: input.orderType || this.config.orderType,
      vnp_Locale: input.lang || this.config.locale,
      vnp_ReturnUrl: input.returnUrl,
      vnp_IpAddr: getClientIp(input),
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    if (input.bankCode) {
      payload.vnp_BankCode = input.bankCode;
    }

    const secureHash = this.createSecureHash(payload);
    const paymentUrl = `${this.config.paymentEndpoint}?${buildVnpayQuery({
      ...payload,
      vnp_SecureHash: secureHash,
    })}`;

    return {
      paymentMethod: this.method,
      orderId: input.orderId,
      requestId: input.orderId,
      paymentUrl,
      gatewayResponse: {
        vnp_TxnRef: input.orderId,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
      },
      signedPayload: {
        ...payload,
        vnp_SecureHash: secureHash,
      },
    };
  }

  verifyReturn(payload = {}) {
    requireConfig(this.config);
    const signedPayload = this.sanitizeReturnPayload(payload);
    const hashData = buildVnpayHashData(signedPayload);
    const isValid = verifyHmacSignature(hashData, payload.vnp_SecureHash || '', this.config.hashSecret, 'sha512');

    return {
      isValid,
      status: payload.vnp_ResponseCode === '00' && payload.vnp_TransactionStatus === '00' ? 'success' : 'failed',
      orderId: payload.vnp_TxnRef,
      gatewayTransactionId: payload.vnp_TransactionNo,
      responseCode: payload.vnp_ResponseCode,
      raw: payload,
    };
  }

  verifyIpn(payload = {}) {
    const result = this.verifyReturn(payload);

    return {
      ...result,
      responsePayload: result.isValid
        ? { RspCode: '00', Message: 'Confirm Success' }
        : { RspCode: '97', Message: 'Invalid Checksum' },
    };
  }

  async queryStatus() {
    throw new Error('VNPAY querydr chua duoc kich hoat trong module nay.');
  }
}

module.exports = VnpayStrategy;
