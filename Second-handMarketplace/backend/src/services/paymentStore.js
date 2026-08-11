const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = require('../config/env');

let adminClient;

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong backend/.env.');
  }
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

function toDatabasePatch(orderId, patch) {
  const values = {
    transaction_id: orderId,
    provider: patch.paymentMethod,
    request_id: patch.requestId,
    amount: patch.amount,
    order_info: patch.orderInfo,
    status: patch.status,
    payment_url: patch.paymentUrl,
    gateway_response: patch.gatewayResponse || patch.gatewayPayload,
    gateway_transaction_id: patch.gatewayTransactionId,
    response_code: patch.responseCode == null ? undefined : String(patch.responseCode),
    updated_at: new Date().toISOString(),
  };
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

function fromDatabase(row) {
  if (!row) return null;
  return {
    orderId: row.transaction_id,
    paymentMethod: row.provider,
    requestId: row.request_id,
    amount: row.amount == null ? undefined : Number(row.amount),
    orderInfo: row.order_info,
    status: row.status,
    paymentUrl: row.payment_url,
    gatewayResponse: row.gateway_response || {},
    gatewayTransactionId: row.gateway_transaction_id,
    responseCode: row.response_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function upsertPayment(orderId, patch = {}) {
  const key = String(orderId || '').trim();
  if (!key) return null;

  const client = getAdminClient();
  const { data, error } = await client
    .from('payment_attempts')
    .upsert(toDatabasePatch(key, patch), { onConflict: 'transaction_id' })
    .select('*')
    .single();
  if (error) throw error;
  return fromDatabase(data);
}

async function getPayment(orderId) {
  const key = String(orderId || '').trim();
  if (!key) return null;
  const { data, error } = await getAdminClient()
    .from('payment_attempts')
    .select('*')
    .eq('transaction_id', key)
    .maybeSingle();
  if (error) throw error;
  return fromDatabase(data);
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
  return upsertPayment(orderId, {
    status: normalizeGatewayStatus(paymentMethod, payload),
    paymentMethod,
    gatewayPayload: payload,
    gatewayTransactionId: payload.transId || payload.vnp_TransactionNo || '',
    responseCode: payload.resultCode ?? payload.vnp_ResponseCode ?? '',
  });
}

module.exports = { getPayment, normalizeGatewayStatus, updatePaymentFromGateway, upsertPayment };
