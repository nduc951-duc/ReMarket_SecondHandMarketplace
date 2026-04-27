const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../../config/env');

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
 * Create a new product
 * @param {object} productData - { seller_id, title, description, price, category, condition, images, location }
 */
async function createProduct(productData) {
  const client = getAdminClient();

  const { data, error } = await client
    .from('products')
    .insert([productData])
    .select()
    .single();

  if (error) {
    throw new Error(`Không thể tạo sản phẩm: ${error.message}`);
  }

  return data;
}

/**
 * Get product by ID
 * @param {string} productId
 */
async function getProductById(productId) {
  const client = getAdminClient();

  const { data, error } = await client
    .from('products')
    .select(`
      *,
      profiles:seller_id (
        full_name,
        avatar_url,
        phone,
        rating_avg,
        rating_count
      )
    `)
    .eq('id', productId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Product not found
    }
    throw new Error(`Không thể lấy sản phẩm: ${error.message}`);
  }

  return data;
}

/**
 * Get products with pagination and filters
 * @param {object} options - { page, limit, category, condition, status, seller_id, search }
 */
async function getProducts(options = {}) {
  const client = getAdminClient();

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
  const offset = (page - 1) * limit;

  let query = client
    .from('products')
    .select(`
      *,
      profiles:seller_id (
        full_name,
        avatar_url,
        rating_avg,
        rating_count
      )
    `, { count: 'exact' })
    .eq('status', 'active') // Only active products by default
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (options.category) {
    query = query.eq('category', options.category);
  }

  if (options.condition) {
    query = query.eq('condition', options.condition);
  }

  if (options.seller_id) {
    query = query.eq('seller_id', options.seller_id);
  }

  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  if (options.min_price !== undefined) {
    query = query.gte('price', options.min_price);
  }

  if (options.max_price !== undefined) {
    query = query.lte('price', options.max_price);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Không thể lấy danh sách sản phẩm: ${error.message}`);
  }

  return {
    products: data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Update product
 * @param {string} productId
 * @param {string} sellerId
 * @param {object} updateData
 */
async function updateProduct(productId, sellerId, updateData) {
  const client = getAdminClient();

  const payload = {
    ...updateData,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('products')
    .update(payload)
    .eq('id', productId)
    .eq('seller_id', sellerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Không thể cập nhật sản phẩm: ${error.message}`);
  }

  return data;
}

/**
 * Soft delete product (set status to hidden)
 * @param {string} productId
 * @param {string} sellerId
 */
async function deleteProduct(productId, sellerId) {
  const client = getAdminClient();

  const { data, error } = await client
    .from('products')
    .update({
      status: 'hidden',
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .eq('seller_id', sellerId)
    .neq('status', 'banned')
    .select()
    .single();

  if (error) {
    throw new Error(`Không thể ẩn sản phẩm: ${error.message}`);
  }

  return data;
}

/**
 * Check whether product has open orders (pending/confirmed)
 * @param {string} productId
 */
async function hasOpenTransactionsForProduct(productId) {
  const client = getAdminClient();

  const { count, error } = await client
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .in('status', ['pending', 'confirmed']);

  if (error) {
    throw new Error(`Không thể kiểm tra trạng thái đơn hàng: ${error.message}`);
  }

  return (count || 0) > 0;
}

/**
 * Get products by seller
 * @param {string} sellerId
 * @param {object} options - { page, limit, status }
 */
async function getProductsBySeller(sellerId, options = {}) {
  const client = getAdminClient();

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
  const offset = (page - 1) * limit;
  const status = options.status || null;
  const includeAllStatuses = Boolean(options.includeAllStatuses);

  let query = client
    .from('products')
    .select('*', { count: 'exact' })
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  } else if (!includeAllStatuses) {
    query = query.eq('status', 'active');
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Không thể lấy sản phẩm của người bán: ${error.message}`);
  }

  return {
    products: data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

module.exports = {
  createProduct,
  getProductById,
  getProducts,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
  hasOpenTransactionsForProduct,
};