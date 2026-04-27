const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require('../config/env');

let adminClient = null;

function getAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Thieu SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY trong backend/.env.');
  }

  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

function buildServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getAdminOverview() {
  const client = getAdminClient();

  const [usersCount, productsCount, transactionsCount] = await Promise.all([
    client.from('profiles').select('id', { count: 'exact', head: true }),
    client.from('products').select('id', { count: 'exact', head: true }),
    client.from('transactions').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalUsers: usersCount.count || 0,
    totalProducts: productsCount.count || 0,
    totalTransactions: transactionsCount.count || 0,
  };
}

async function getAdminUsers(options = {}) {
  const client = getAdminClient();
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const offset = (page - 1) * limit;

  let query = client.from('profiles').select('*', { count: 'exact' });

  if (options.search) {
    query = query.or(`full_name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw buildServiceError(`Loi khi lay danh sach user: ${error.message}`, 500);
  }

  return {
    users: data || [],
    page,
    limit,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

async function getAdminProducts(options = {}) {
  const client = getAdminClient();
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const offset = (page - 1) * limit;

  let query = client.from('products').select(`
    *,
    seller:seller_id (
      full_name,
      avatar_url
    )
  `, { count: 'exact' });

  if (options.search) {
    query = query.ilike('title', `%${options.search}%`);
  }
  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw buildServiceError(`Loi khi lay danh sach san pham: ${error.message}`, 500);
  }

  return {
    products: data || [],
    page,
    limit,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

async function updateProductStatusByAdmin(productId, status) {
  const client = getAdminClient();

  const { data, error } = await client
    .from('products')
    .update({ status })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    throw buildServiceError(`Loi khi cap nhat san pham: ${error.message}`, 500);
  }

  return data;
}

async function getAdminTransactions(options = {}) {
  const client = getAdminClient();
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const offset = (page - 1) * limit;

  let query = client.from('transactions').select(`
    *,
    buyer:buyer_id (
      full_name,
      avatar_url
    ),
    seller:seller_id (
      full_name,
      avatar_url
    )
  `, { count: 'exact' });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw buildServiceError(`Loi khi lay danh sach giao dich: ${error.message}`, 500);
  }

  return {
    transactions: data || [],
    page,
    limit,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

module.exports = {
  getAdminOverview,
  getAdminUsers,
  getAdminProducts,
  updateProductStatusByAdmin,
  getAdminTransactions,
};
