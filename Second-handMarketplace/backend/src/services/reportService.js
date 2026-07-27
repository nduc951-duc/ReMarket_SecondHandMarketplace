const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = require('../config/env');

let adminClient = null;

function buildServiceError(message, statusCode = 400, code = 'REPORT_REQUEST_FAILED') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getAdminClient() {
  if (adminClient) return adminClient;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw buildServiceError('Moderation service is not configured.', 503, 'SERVICE_UNAVAILABLE');
  }

  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

async function resolveTarget(client, reporterId, payload) {
  if (payload.target_type === 'product') {
    const { data: product, error } = await client
      .from('products')
      .select('id, seller_id, title')
      .eq('id', payload.product_id)
      .maybeSingle();

    if (error) throw buildServiceError(`Khong the kiem tra san pham: ${error.message}`, 500);
    if (!product) throw buildServiceError('San pham khong ton tai.', 404, 'PRODUCT_NOT_FOUND');
    if (product.seller_id === reporterId) {
      throw buildServiceError('Ban khong the bao cao tin dang cua chinh minh.', 403, 'SELF_REPORT');
    }

    return {
      product_id: product.id,
      reported_user_id: product.seller_id,
    };
  }

  if (payload.reported_user_id === reporterId) {
    throw buildServiceError('Ban khong the bao cao chinh minh.', 403, 'SELF_REPORT');
  }

  const { data: profile, error } = await client
    .from('profiles')
    .select('id')
    .eq('id', payload.reported_user_id)
    .maybeSingle();
  if (error) throw buildServiceError(`Khong the kiem tra user: ${error.message}`, 500);
  if (!profile) throw buildServiceError('User khong ton tai.', 404, 'USER_NOT_FOUND');

  return { reported_user_id: profile.id };
}

async function createReport(reporterId, payload) {
  const client = getAdminClient();
  const target = await resolveTarget(client, reporterId, payload);
  const { data, error } = await client
    .from('reports')
    .insert({
      reporter_id: reporterId,
      target_type: payload.target_type,
      reason: payload.reason,
      details: payload.details || '',
      evidence_urls: payload.evidence_urls || [],
      ...target,
    })
    .select()
    .single();

  if (error) throw buildServiceError(`Khong the tao bao cao: ${error.message}`, 500);
  return data;
}

async function getMyReports(reporterId) {
  const client = getAdminClient();
  const { data, error } = await client
    .from('reports')
    .select('*')
    .eq('reporter_id', reporterId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw buildServiceError(`Khong the lay bao cao: ${error.message}`, 500);
  return data || [];
}

async function getModerationReports(options = {}) {
  const client = getAdminClient();
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
  let query = client
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (options.status && options.status !== 'all') query = query.eq('status', options.status);

  const { data, error } = await query;
  if (error) throw buildServiceError(`Khong the lay moderation queue: ${error.message}`, 500);
  return data || [];
}

async function moderateReport(actorId, reportId, payload) {
  const client = getAdminClient();
  const { data, error } = await client.rpc('process_moderation_report', {
    p_report_id: reportId,
    p_actor_id: actorId,
    p_status: payload.status,
    p_action: payload.action || 'none',
    p_note: payload.note || '',
  });

  if (error) {
    const message = String(error.message || '');
    if (message.includes('report_not_found')) {
      throw buildServiceError('Bao cao khong ton tai.', 404, 'REPORT_NOT_FOUND');
    }
    if (message.includes('already_closed')) {
      throw buildServiceError('Bao cao da duoc dong.', 409, 'REPORT_ALREADY_CLOSED');
    }
    if (message.includes('forbidden')) {
      throw buildServiceError('Ban khong co quyen moderation.', 403, 'FORBIDDEN');
    }
    throw buildServiceError(`Khong the xu ly bao cao: ${message}`, 400);
  }

  return data;
}

module.exports = {
  createReport,
  getModerationReports,
  getMyReports,
  moderateReport,
  resolveTarget,
};
