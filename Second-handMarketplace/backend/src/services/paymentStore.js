const payments = new Map();

function upsertPayment(orderId, patch = {}) {
  const key = String(orderId || '').trim();
  if (!key) return null;

  const now = new Date().toISOString();
  const current = payments.get(key) || {
    orderId: key,
    status: 'pending',
    createdAt: now,
  };

  const next = {
    ...current,
    ...patch,
    orderId: key,
    updatedAt: now,
  };

  payments.set(key, next);
  return next;
}

function getPayment(orderId) {
  return payments.get(String(orderId || '').trim()) || null;
}

function normalizeGatewayStatus(paymentMethod, payload = {}) {
  if (paymentMethod === 'momo') {
    const resultCode = Number(payload.resultCode);
    if (resultCode === 0) return 'success';
    if ([9000, 1000, 7000, 7002].includes(resultCode)) return 'pending';
    return 'failed';
  }

  if (paymentMethod === 'vnpay') {
    if (payload.vnp_ResponseCode === '00' && payload.vnp_TransactionStatus === '00') {
      return 'success';
    }
    if (!payload.vnp_TransactionStatus || payload.vnp_TransactionStatus === '01') {
      return 'pending';
    }
    return 'failed';
  }

  return 'pending';
}

function updatePaymentFromGateway(paymentMethod, payload = {}) {
  const orderId = payload.orderId || payload.vnp_TxnRef;
  const status = normalizeGatewayStatus(paymentMethod, payload);

  return upsertPayment(orderId, {
    status,
    paymentMethod,
    gatewayPayload: payload,
    gatewayTransactionId: payload.transId || payload.vnp_TransactionNo || '',
    responseCode: payload.resultCode ?? payload.vnp_ResponseCode ?? '',
  });
}

module.exports = {
  getPayment,
  normalizeGatewayStatus,
  updatePaymentFromGateway,
  upsertPayment,
};
