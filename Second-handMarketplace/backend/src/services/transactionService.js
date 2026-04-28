const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');
const { createNotification } = require('./notificationService');

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

function isRelationMissing(error, relationName) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('relation')
    && message.includes('does not exist')
    && message.includes(relationName)
  );
}

async function enrichTransactionsWithProfilesAndReviews(client, userId, transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  const participantIds = Array.from(
    new Set(
      transactions
        .flatMap((item) => [item.buyer_id, item.seller_id])
        .filter(Boolean),
    ),
  );

  let profileMap = new Map();

  if (participantIds.length > 0) {
    const { data: profileRows, error: profileError } = await client
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', participantIds);

    if (profileError) {
      throw buildServiceError(`Khong the lay profile giao dich: ${profileError.message}`, 500);
    }

    profileMap = new Map((profileRows || []).map((profile) => [profile.id, profile]));
  }

  const transactionIds = transactions.map((item) => item.id).filter(Boolean);
  let reviewMap = new Map();

  if (transactionIds.length > 0) {
    const { data: reviewRows, error: reviewError } = await client
      .from('reviews')
      .select('id, transaction_id, rating, comment, created_at')
      .eq('reviewer_id', userId)
      .in('transaction_id', transactionIds);

    if (reviewError && !isRelationMissing(reviewError, 'reviews')) {
      throw buildServiceError(`Khong the lay review cua giao dich: ${reviewError.message}`, 500);
    }

    reviewMap = new Map((reviewRows || []).map((review) => [review.transaction_id, review]));
  }

  return transactions.map((transaction) => ({
    ...transaction,
    buyer: profileMap.get(transaction.buyer_id) || null,
    seller: profileMap.get(transaction.seller_id) || null,
    my_review: reviewMap.get(transaction.id) || null,
  }));
}

async function notifyTransactionStatusChange({
  transaction,
  currentStatus,
  newStatus,
  actorUserId,
}) {
  let targetUserId = null;
  let title = '';
  let message = '';

  if (newStatus === 'confirmed') {
    targetUserId = transaction.buyer_id;
    title = 'Don hang da duoc xac nhan';
    message = `${transaction.product_name || 'San pham'} dang duoc nguoi ban xu ly.`;
  }

  if (newStatus === 'shipped') {
    targetUserId = transaction.buyer_id;
    title = 'Don hang da duoc giao';
    message = `${transaction.product_name || 'San pham'} dang tren duong giao den ban.`;
  }

  if (newStatus === 'completed') {
    targetUserId = transaction.seller_id;
    title = 'Don hang da hoan thanh';
    message = `Nguoi mua da xac nhan nhan ${transaction.product_name || 'san pham'}.`;
  }

  if (newStatus === 'cancelled') {
    if (actorUserId === transaction.seller_id) {
      targetUserId = transaction.buyer_id;
      title = 'Don hang da bi huy';
      message = currentStatus === 'pending'
        ? `Nguoi ban da tu choi don ${transaction.product_name || 'san pham'}.`
        : `Don ${transaction.product_name || 'san pham'} da bi huy boi nguoi ban.`;
    } else if (actorUserId === transaction.buyer_id) {
      targetUserId = transaction.seller_id;
      title = 'Nguoi mua da huy don';
      message = `Don ${transaction.product_name || 'san pham'} da bi nguoi mua huy.`;
    }
  }

  if (!targetUserId || targetUserId === actorUserId) {
    return;
  }

  await createNotification({
    user_id: targetUserId,
    type: 'transaction_status',
    title,
    message,
    entity_type: 'transaction',
    entity_id: transaction.id,
    metadata: {
      transaction_id: transaction.id,
      status: newStatus,
      actor_user_id: actorUserId,
    },
  });
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

  let data = [];
  let count = 0;
  let error = null;

  if (type === 'all') {
    const rangeEnd = offset + limit - 1;

    const [buyResponse, sellResponse] = await Promise.all([
      (async () => {
        let query = client
          .from('transactions')
          .select('*', { count: 'exact' })
          .eq('buyer_id', userId)
          .order('created_at', { ascending: false })
          .range(0, rangeEnd);

        if (status) {
          query = query.eq('status', status);
        }

        return query;
      })(),
      (async () => {
        let query = client
          .from('transactions')
          .select('*', { count: 'exact' })
          .eq('seller_id', userId)
          .order('created_at', { ascending: false })
          .range(0, rangeEnd);

        if (status) {
          query = query.eq('status', status);
        }

        return query;
      })(),
    ]);

    if (buyResponse.error || sellResponse.error) {
      error = buyResponse.error || sellResponse.error;
    } else {
      const merged = [...(buyResponse.data || []), ...(sellResponse.data || [])];
      const uniqueMap = new Map();
      for (const item of merged) {
        uniqueMap.set(item.id, item);
      }

      const mergedUnique = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      data = mergedUnique.slice(offset, offset + limit);
      count = (buyResponse.count || 0) + (sellResponse.count || 0);
    }
  } else {
    let query = client
      .from('transactions')
      .select('*', { count: 'exact' });

    if (type === 'buy') {
      query = query.eq('buyer_id', userId);
    } else {
      query = query.eq('seller_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const response = await query;
    data = response.data || [];
    count = response.count || 0;
    error = response.error || null;
  }

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

  const enrichedTransactions = await enrichTransactionsWithProfilesAndReviews(
    client,
    userId,
    data || [],
  );

  return {
    transactions: enrichedTransactions,
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

  if (data.seller_id && data.seller_id !== data.buyer_id) {
    try {
      await createNotification({
        user_id: data.seller_id,
        type: 'new_order',
        title: 'Ban co don hang moi',
        message: `Don mua moi cho ${data.product_name || 'san pham'}.`,
        entity_type: 'transaction',
        entity_id: data.id,
        metadata: {
          transaction_id: data.id,
          product_id: data.product_id,
          buyer_id: data.buyer_id,
        },
      });
    } catch (notificationError) {
      console.error('Create transaction notification error:', notificationError);
    }
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

  try {
    await notifyTransactionStatusChange({
      transaction,
      currentStatus,
      newStatus,
      actorUserId: userId,
    });
  } catch (notificationError) {
    console.error('Notify transaction status error:', notificationError);
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

  const enriched = await enrichTransactionsWithProfilesAndReviews(client, userId, [data]);

  if (enriched.length > 0) {
    return enriched[0];
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