const PaymentStrategy = require('./PaymentStrategy');
const crypto = require('crypto');
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

function createQueryRequestId() {
  return `${Date.now()}${crypto.randomBytes(6).toString('hex')}`;
}

function buildQueryResponseSignaturePayload(payload = {}) {
  return [
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
  ]
    .map((field) => payload[field] ?? '')
    .join('|');
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
    const isValid = verifyHmacSignature(
      hashData,
      payload.vnp_SecureHash || '',
      this.config.hashSecret,
      'sha512',
    );

    return {
      isValid,
      status:
        payload.vnp_ResponseCode === '00' && payload.vnp_TransactionStatus === '00'
          ? 'success'
          : 'failed',
      orderId: payload.vnp_TxnRef,
      amount: Number(payload.vnp_Amount) / 100,
      currency: String(payload.vnp_CurrCode || this.config.currCode || 'VND').toUpperCase(),
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

  async queryStatus({ orderId, requestId, transactionDate, orderInfo, ipAddress } = {}) {
    requireConfig(this.config);

    if (!orderId) {
      throw new Error('orderId la bat buoc khi truy van VNPAY.');
    }
    if (!transactionDate || !/^\d{14}$/.test(String(transactionDate))) {
      throw new Error('transactionDate VNPAY phai co dinh dang yyyyMMddHHmmss.');
    }

    const normalizedRequestId = String(requestId || '').trim();
    const payload = {
      vnp_RequestId:
        normalizedRequestId && normalizedRequestId.length <= 32
          ? normalizedRequestId
          : createQueryRequestId(),
      vnp_Version: this.config.version,
      vnp_Command: 'querydr',
      vnp_TmnCode: this.config.tmnCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo || `Truy van giao dich ${orderId}`,
      vnp_TransactionDate: String(transactionDate),
      vnp_CreateDate: formatVnpayDate(),
      vnp_IpAddr: getClientIp({ ipAddress }),
    };
    const signatureData = [
      payload.vnp_RequestId,
      payload.vnp_Version,
      payload.vnp_Command,
      payload.vnp_TmnCode,
      payload.vnp_TxnRef,
      payload.vnp_TransactionDate,
      payload.vnp_CreateDate,
      payload.vnp_IpAddr,
      payload.vnp_OrderInfo,
    ].join('|');
    payload.vnp_SecureHash = createHmacSignature(signatureData, this.config.hashSecret, 'sha512');

    const response = await fetch(this.config.queryEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.vnp_Message || 'Khong the truy van giao dich VNPAY.');
    }

    const isValid = verifyHmacSignature(
      buildQueryResponseSignaturePayload(result),
      result.vnp_SecureHash || '',
      this.config.hashSecret,
      'sha512',
    );
    if (!isValid) {
      throw new Error('Chu ky phan hoi truy van VNPAY khong hop le.');
    }

    return { ...result, isValid: true };
  }
}

module.exports = VnpayStrategy;
