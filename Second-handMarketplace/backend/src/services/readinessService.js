const { createClient } = require('@supabase/supabase-js');
const { READINESS_TIMEOUT_MS, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = require('../config/env');
const paymentConfig = require('../config/payment');

function getConfigurationStatus() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  return {
    ready: missing.length === 0,
    missing,
  };
}

function getPaymentStatus() {
  return {
    momo: Boolean(
      paymentConfig.momo.partnerCode &&
      paymentConfig.momo.accessKey &&
      paymentConfig.momo.secretKey,
    ),
    vnpay: Boolean(paymentConfig.vnpay.tmnCode && paymentConfig.vnpay.hashSecret),
  };
}

async function checkReadiness({ createSupabaseClient = createClient } = {}) {
  const config = getConfigurationStatus();
  const checks = {
    config,
    supabase: { ready: false },
    storage: { ready: false },
    payments: getPaymentStatus(),
  };

  if (!config.ready) {
    return { ready: false, checks };
  }

  const client = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('readiness_timeout')), READINESS_TIMEOUT_MS);
  });
  const [databaseResult, storageResult] = await Promise.race([
    Promise.all([
      client.from('profiles').select('id', { head: true, count: 'exact' }).limit(1),
      client.storage.listBuckets(),
    ]),
    timeout,
  ]).finally(() => clearTimeout(timeoutId));

  checks.supabase = {
    ready: !databaseResult.error,
    ...(databaseResult.error ? { error: 'database_unavailable' } : {}),
  };
  checks.storage = {
    ready: !storageResult.error,
    ...(storageResult.error ? { error: 'storage_unavailable' } : {}),
  };

  return {
    ready: checks.supabase.ready && checks.storage.ready,
    checks,
  };
}

module.exports = {
  checkReadiness,
  getConfigurationStatus,
  getPaymentStatus,
};
