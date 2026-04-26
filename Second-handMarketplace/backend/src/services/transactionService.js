const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');

let adminClient = null;

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
  const type = options.type || 'all'; // 'buy', 'sell', or 'all'
  const status = options.status || null;

  let query = client
    .from('transactions')
    .select('*', { count: 'exact' });

  // Filter by role
  if (type === 'buy') {
    query = query.eq('buyer_id', userId);
  } else if (type === 'sell') {
    query = query.eq('seller_id', userId);
  } else {
    query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  }

  // Filter by status
  if (status) {
    query = query.eq('status', status);
  }

  // Order and paginate
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    // If table doesn't exist, return empty
    if (String(error.message || '').includes('relation') && String(error.message || '').includes('does not exist')) {
      return {
        transactions: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
    throw error;
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
    // Count purchases
    const { count: buyCount, error: buyError } = await client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', userId);

    // Count sales
    const { count: sellCount, error: sellError } = await client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', userId);

    // Completed purchases
    const { count: completedBuyCount } = await client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .eq('status', 'completed');

    // Completed sales
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
    // If table doesn't exist, return zeros
    return {
      totalBuy: 0,
      totalSell: 0,
      completedBuy: 0,
      completedSell: 0,
    };
  }
}

module.exports = {
  getTransactions,
  getTransactionStats,
};
