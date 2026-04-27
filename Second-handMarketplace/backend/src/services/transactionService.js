const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');

const OPEN_ORDER_STATUSES = ['pending', 'confirmed'];
const ORDER_FLOW_STATUSES = ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'];

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
      'Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong backend/.env.',
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

/**
 * Get transactions for a user (both as buyer and seller).
 * @param {string} userId
 * @param {object} options - { type: 'buy'|'sell'|'all', page, limit, status }
 */
async function getTransactions(userId, options = {}) {
  const client = getAdminClient();

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
  const offset = (page - 1) * limit;
  const type = options.type || 'all';
  const status = options.status || null;

  let query = client
    .from('transactions')
    .select('*', { count: 'exact' });

  if (type === 'buy') {
    query = query.eq('buyer_id', userId);
  } else if (type === 'sell') {
    query = query.eq('seller_id', userId);
  } else {
    query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    if (
      String(error.message || '').includes('relation')
      && String(error.message || '').includes('does not exist')
    ) {
      return {
        transactions: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    throw buildServiceError(`Không thể lấy danh sách giao dịch: ${error.message}`, 500);
  }

  return {
    transactions: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Get a summary of transaction stats for a user.
 */
async function getTransactionStats(userId) {
  const client = getAdminClient();

  try {
    const { count: buyCount } = await client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', userId);

    const { count: sellCount } = await client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', userId);

    const { count: completedBuyCount } = await client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .eq('status', 'completed');

    const { count: completedSellCount } = await client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('status', 'completed');

    return {
      totalBuy: buyCount || 0,
      totalSell: sellCount || 0,
      completedBuy: completedBuyCount || 0,
      completedSell: completedSellCount || 0,
    };
  } catch (error) {
    return {
      totalBuy: 0,
      totalSell: 0,
      completedBuy: 0,
      completedSell: 0,
    };
  }
}

/**
 * Create a new transaction/order
 * @param {object} transactionData - { buyer_id, seller_id, product_id, product_name, product_image, amount, payment_method, note }
 */
async function createTransaction(transactionData) {
  const client = getAdminClient();

  const { data: existingOpenOrders, error: existingError } = await client
    .from('transactions')
    .select('id')
    .eq('product_id', transactionData.product_id)
    .in('status', OPEN_ORDER_STATUSES)
    .limit(1);

  if (existingError) {
    throw buildServiceError(`Không thể kiểm tra đơn hàng hiện tại: ${existingError.message}`, 500);
  }

  if (existingOpenOrders && existingOpenOrders.length > 0) {
    throw buildServiceError('Sản phẩm đã có đơn hàng pending/confirmed.', 409);
  }

  const now = new Date().toISOString();
  const payload = {
    ...transactionData,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await client
    .from('transactions')
    .insert([payload])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw buildServiceError('Sản phẩm đã có đơn hàng pending/confirmed.', 409);
    }
    throw buildServiceError(`Không thể tạo giao dịch: ${error.message}`, 500);
  }

  return data;
}

/**
 * Update transaction status
 * @param {string} transactionId
 * @param {string} userId - User making the update (buyer or seller)
 * @param {string} newStatus
 * @param {object} additionalData - { rejection_reason, etc. }
 */
async function updateTransactionStatus(transactionId, userId, newStatus, additionalData = {}) {
  const client = getAdminClient();

  const { data: transaction, error: fetchError } = await client
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw buildServiceError('Không tìm thấy giao dịch.', 404);
    }
    throw buildServiceError(`Không thể lấy giao dịch: ${fetchError.message}`, 500);
  }

  if (transaction.buyer_id !== userId && transaction.seller_id !== userId) {
    throw buildServiceError('Bạn không có quyền cập nhật giao dịch này.', 403);
  }

  if (!ORDER_FLOW_STATUSES.includes(newStatus)) {
    throw buildServiceError('Trạng thái không hợp lệ.', 400);
  }

  const currentStatus = transaction.status;
  if (currentStatus === newStatus) {
    return transaction;
  }

  if (newStatus === 'confirmed') {
    if (currentStatus !== 'pending') {
      throw buildServiceError('Chỉ có thể xác nhận đơn từ trạng thái pending.', 400);
    }
    if (transaction.seller_id !== userId) {
      throw buildServiceError('Chỉ người bán mới có thể xác nhận đơn hàng.', 403);
    }
  }

  if (newStatus === 'shipped') {
    if (currentStatus !== 'confirmed') {
      throw buildServiceError('Chỉ có thể giao hàng từ trạng thái confirmed.', 400);
    }
    if (transaction.seller_id !== userId) {
      throw buildServiceError('Chỉ người bán mới có thể cập nhật trạng thái giao hàng.', 403);
    }
  }

  if (newStatus === 'completed') {
    if (currentStatus !== 'shipped') {
      throw buildServiceError('Chỉ có thể hoàn thành đơn từ trạng thái shipped.', 400);
    }
    if (transaction.buyer_id !== userId) {
      throw buildServiceError('Chỉ người mua mới có thể xác nhận đã nhận hàng.', 403);
    }
  }

  if (newStatus === 'cancelled') {
    if (!['pending', 'confirmed'].includes(currentStatus)) {
      throw buildServiceError('Không thể hủy đơn hàng ở trạng thái hiện tại.', 400);
    }

    if (currentStatus === 'pending' && transaction.seller_id !== userId) {
      throw buildServiceError('Chỉ người bán mới có thể từ chối đơn pending.', 403);
    }

    const rejectionReason = String(additionalData.rejection_reason || '').trim();
    if (currentStatus === 'pending' && !rejectionReason) {
      throw buildServiceError('Vui lòng nhập lý do từ chối đơn hàng.', 400);
    }
  }

  const now = new Date().toISOString();
  const updateData = {
    status: newStatus,
    updated_at: now,
  };

  const timestampFields = {
    confirmed: 'confirmed_at',
    shipped: 'shipped_at',
    completed: 'completed_at',
    cancelled: 'cancelled_at',
  };

  if (timestampFields[newStatus]) {
    updateData[timestampFields[newStatus]] = now;
  }

  if (newStatus === 'cancelled') {
    updateData.rejection_reason = String(additionalData.rejection_reason || '').trim();
  }

  const { data, error } = await client
    .from('transactions')
    .update(updateData)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) {
    throw buildServiceError(`Không thể cập nhật giao dịch: ${error.message}`, 500);
  }

  if (transaction.product_id) {
    if (newStatus === 'confirmed') {
      const { data: productData, error: productError } = await client
        .from('products')
        .update({
          status: 'sold',
          updated_at: now,
        })
        .eq('id', transaction.product_id)
        .eq('status', 'active')
        .select('id')
        .maybeSingle();

      if (productError) {
        throw buildServiceError(`Không thể cập nhật trạng thái sản phẩm: ${productError.message}`, 500);
      }

      if (!productData) {
        throw buildServiceError('Sản phẩm không còn khả dụng để xác nhận đơn.', 409);
      }
    }

    if (newStatus === 'cancelled' && currentStatus === 'confirmed') {
      const { error: productError } = await client
        .from('products')
        .update({
          status: 'active',
          updated_at: now,
        })
        .eq('id', transaction.product_id)
        .neq('status', 'banned');

      if (productError) {
        throw buildServiceError(`Không thể cập nhật trạng thái sản phẩm: ${productError.message}`, 500);
      }
    }
  }

  return data;
}

/**
 * Get transaction by ID with full details
 * @param {string} transactionId
 * @param {string} userId - For permission check
 */
async function getTransactionById(transactionId, userId) {
  const client = getAdminClient();

  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw buildServiceError(`Không thể lấy giao dịch: ${error.message}`, 500);
  }

  if (data.buyer_id !== userId && data.seller_id !== userId) {
    throw buildServiceError('Bạn không có quyền xem giao dịch này.', 403);
  }

  return data;
}

module.exports = {
  createTransaction,
  getTransactionById,
  getTransactions,
  getTransactionStats,
  updateTransactionStatus,
};