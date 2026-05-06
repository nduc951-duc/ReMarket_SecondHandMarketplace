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

async function fetchProfilesMap(client, userIds) {
  const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, avatar_url, email, role, status')
    .in('id', uniqueIds);

  if (error) {
    throw buildServiceError(`Loi khi lay profile: ${error.message}`, 500);
  }

  return new Map((data || []).map((profile) => [profile.id, profile]));
}

async function getAdminOverview() {
  const client = getAdminClient();

  const [usersCount, productsCount, transactionsCount] = await Promise.all([
    client.from('profiles').select('id', { count: 'exact', head: true }),
    client.from('products').select('id', { count: 'exact', head: true }),
    client.from('transactions').select('id', { count: 'exact', head: true }),
  ]);

  const { data: productStatuses } = await client
    .from('products')
    .select('status');

  const { data: transactionStatuses } = await client
    .from('transactions')
    .select('status, amount');

  const productsByStatus = (productStatuses || []).reduce((acc, item) => {
    const key = item.status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const transactionsByStatus = (transactionStatuses || []).reduce((acc, item) => {
    const key = item.status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = (transactionStatuses || []).reduce((sum, item) => {
    if (item.status !== 'completed') {
      return sum;
    }
    return sum + Number(item.amount || 0);
  }, 0);

  return {
    users: {
      total: usersCount.count || 0,
      emailConfirmed: usersCount.count || 0,
    },
    products: {
      total: productsCount.count || 0,
      byStatus: productsByStatus,
    },
    transactions: {
      total: transactionsCount.count || 0,
      byStatus: transactionsByStatus,
      totalRevenue,
    },
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
    items: data || [],
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

  let query = client.from('products').select('*', { count: 'exact' });

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

  const profileMap = await fetchProfilesMap(
    client,
    (data || []).map((item) => item.seller_id),
  );

  const products = (data || []).map((item) => ({
    ...item,
    profile: profileMap.get(item.seller_id) || null,
  }));

  return {
    products,
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

  let query = client.from('transactions').select('*', { count: 'exact' });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw buildServiceError(`Loi khi lay danh sach giao dich: ${error.message}`, 500);
  }

  const profileMap = await fetchProfilesMap(
    client,
    [
      ...(data || []).map((item) => item.buyer_id),
      ...(data || []).map((item) => item.seller_id),
    ],
  );

  const transactions = (data || []).map((item) => ({
    ...item,
    buyer: profileMap.get(item.buyer_id) || null,
    seller: profileMap.get(item.seller_id) || null,
  }));

  return {
    transactions,
    page,
    limit,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

async function updateUserRole(userId, role) {
  const client = getAdminClient();
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (!['admin', 'agent', 'customer'].includes(normalizedRole)) {
    throw buildServiceError('Role khong hop le.', 400);
  }

  const { error: authError } = await client.auth.admin.updateUserById(userId, {
    user_metadata: { role: normalizedRole },
  });

  if (authError) {
    throw buildServiceError(`Loi khi cap nhat role: ${authError.message}`, 500);
  }

  const { data, error } = await client
    .from('profiles')
    .upsert({ id: userId, role: normalizedRole, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw buildServiceError(`Loi khi cap nhat profile role: ${error.message}`, 500);
  }

  return data;
}

async function updateUserStatus(userId, status) {
  const client = getAdminClient();
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (!['active', 'blocked'].includes(normalizedStatus)) {
    throw buildServiceError('Trang thai khong hop le.', 400);
  }

  const { data, error } = await client
    .from('profiles')
    .upsert({ id: userId, status: normalizedStatus, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw buildServiceError(`Loi khi cap nhat trang thai user: ${error.message}`, 500);
  }

  return data;
}

async function createUser({ email, password, fullName, role }) {
  const client = getAdminClient();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRole = String(role || 'customer').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw buildServiceError('Email va password la bat buoc.', 400);
  }

  const { data, error } = await client.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || '',
      role: normalizedRole,
    },
  });

  if (error) {
    throw buildServiceError(`Loi khi tao user: ${error.message}`, 500);
  }

  const now = new Date().toISOString();
  await client
    .from('profiles')
    .upsert(
      {
        id: data.user.id,
        full_name: fullName || '',
        email: normalizedEmail,
        role: normalizedRole,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'id' },
    );

  return { id: data.user.id, email: normalizedEmail, role: normalizedRole };
}

module.exports = {
  getAdminOverview,
  getAdminUsers,
  getAdminProducts,
  updateProductStatusByAdmin,
  getAdminTransactions,
  updateUserRole,
  updateUserStatus,
  createUser,
};
