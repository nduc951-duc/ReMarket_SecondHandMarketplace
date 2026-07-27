const { createHash } = require('node:crypto');
const { processPaymentCallback } = require('./transactionService');

const SENSITIVE_KEY_PATTERN =
  /authorization|access[_-]?key|secret|secure[_-]?hash|signature|token/i;

function sanitizeGatewayPayload(value, depth = 0) {
  if (depth > 5) {
    return '[TRUNCATED]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeGatewayPayload(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 100)
        .map(([key, item]) => [
          key,
          SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : sanitizeGatewayPayload(item, depth + 1),
        ]),
    );
  }

  if (typeof value === 'string' && value.length > 2048) {
    return `${value.slice(0, 2048)}[TRUNCATED]`;
  }

  return value;
}

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function buildPaymentIdempotencyKey({
  paymentMethod,
  orderId,
  gatewayTransactionId,
  status,
  responseCode,
  amount,
  currency,
  sanitizedPayload,
}) {
  const fingerprint = gatewayTransactionId || stableSerialize(sanitizedPayload);
  const source = [
    paymentMethod,
    orderId,
    fingerprint,
    status,
    String(responseCode ?? ''),
    String(amount ?? ''),
    currency,
  ].join('|');

  return `payevt_${createHash('sha256').update(source).digest('hex')}`;
}

async function processVerifiedPaymentCallback(paymentMethod, result) {
  if (!result?.isValid || !result.orderId) {
    return null;
  }

  const sanitizedPayload = sanitizeGatewayPayload(result.raw || {});
  const currency = String(result.currency || 'VND')
    .trim()
    .toUpperCase();
  const callback = {
    paymentMethod,
    transactionId: String(result.orderId).trim(),
    gatewayTransactionId: String(result.gatewayTransactionId ?? '').trim(),
    status: result.status,
    responseCode: String(result.responseCode ?? ''),
    amount: Number.isFinite(Number(result.amount)) ? Number(result.amount) : null,
    currency,
    sanitizedPayload,
  };

  callback.idempotencyKey = buildPaymentIdempotencyKey({
    ...callback,
    orderId: callback.transactionId,
  });

  return processPaymentCallback(callback);
}

module.exports = {
  buildPaymentIdempotencyKey,
  processVerifiedPaymentCallback,
  sanitizeGatewayPayload,
  stableSerialize,
};
