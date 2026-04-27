const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');

let adminClient = null;

function buildServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Thieu SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY trong backend/.env.',
    );
  }

  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

function isRelationMissing(error, relationName) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('relation')
    && message.includes('does not exist')
    && message.includes(relationName)
  );
}

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return metadata;
}

async function createNotification(payload) {
  if (!payload?.user_id) {
    return null;
  }

  const client = getAdminClient();
  const now = new Date().toISOString();

  const insertPayload = {
    user_id: payload.user_id,
    type: payload.type || 'system',
    title: String(payload.title || '').trim(),
    message: String(payload.message || '').trim(),
    entity_type: String(payload.entity_type || '').trim(),
    entity_id: String(payload.entity_id || '').trim(),
    metadata: normalizeMetadata(payload.metadata),
    is_read: false,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await client
    .from('notifications')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    if (isRelationMissing(error, 'notifications')) {
      return null;
    }

    throw buildServiceError(`Khong the tao thong bao: ${error.message}`, 500);
  }

  return data;
}

async function getNotifications(userId, options = {}) {
  const client = getAdminClient();

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));
  const offset = (page - 1) * limit;
  const unreadOnly = String(options.unreadOnly || '') === 'true';

  let query = client
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error, count } = await query;

  if (error) {
    if (isRelationMissing(error, 'notifications')) {
      return {
        notifications: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    throw buildServiceError(`Khong the lay thong bao: ${error.message}`, 500);
  }

  return {
    notifications: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

async function getUnreadNotificationCount(userId) {
  const client = getAdminClient();

  const { count, error } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    if (isRelationMissing(error, 'notifications')) {
      return 0;
    }

    throw buildServiceError(`Khong the lay so thong bao chua doc: ${error.message}`, 500);
  }

  return count || 0;
}

async function markNotificationRead(userId, notificationId) {
  const client = getAdminClient();

  const { data, error } = await client
    .from('notifications')
    .update({
      is_read: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) {
    if (isRelationMissing(error, 'notifications')) {
      return null;
    }

    throw buildServiceError(`Khong the cap nhat thong bao: ${error.message}`, 500);
  }

  return data;
}

async function markAllNotificationsRead(userId) {
  const client = getAdminClient();

  const { data, error } = await client
    .from('notifications')
    .update({
      is_read: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select('id');

  if (error) {
    if (isRelationMissing(error, 'notifications')) {
      return 0;
    }

    throw buildServiceError(`Khong the cap nhat tat ca thong bao: ${error.message}`, 500);
  }

  return (data || []).length;
}

async function markConversationNotificationsAsRead(userId, conversationId) {
  const client = getAdminClient();

  const { error } = await client
    .from('notifications')
    .update({
      is_read: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('entity_type', 'conversation')
    .eq('entity_id', conversationId)
    .eq('is_read', false);

  if (error) {
    if (isRelationMissing(error, 'notifications')) {
      return;
    }

    throw buildServiceError(`Khong the cap nhat thong bao chat: ${error.message}`, 500);
  }
}

module.exports = {
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  markConversationNotificationsAsRead,
};