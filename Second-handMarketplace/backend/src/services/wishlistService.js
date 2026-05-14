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

async function fetchProfilesMap(client, userIds) {
  const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, avatar_url, verified')
    .in('id', uniqueIds);

  if (error) {
    throw buildServiceError(`Khong the lay thong tin nguoi ban: ${error.message}`, 500);
  }

  return new Map((data || []).map((profile) => [profile.id, profile]));
}

async function getWishlistStatus(userId, productId) {
  const client = getAdminClient();

  const { data, error } = await client
    .from('wishlists')
    .select('product_id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) {
    if (isRelationMissing(error, 'wishlists')) {
      return false;
    }

    throw buildServiceError(`Khong the kiem tra wishlist: ${error.message}`, 500);
  }

  return Boolean(data);
}

async function toggleWishlist(userId, productId) {
  const client = getAdminClient();

  const { data: product, error: productError } = await client
    .from('products')
    .select('id, seller_id, status, title')
    .eq('id', productId)
    .maybeSingle();

  if (productError) {
    throw buildServiceError(`Khong the lay thong tin san pham: ${productError.message}`, 500);
  }

  if (!product) {
    throw buildServiceError('Khong tim thay san pham.', 404);
  }

  if (['hidden', 'banned'].includes(product.status)) {
    throw buildServiceError('San pham khong kha dung de yeu thich.', 400);
  }

  const isWishlisted = await getWishlistStatus(userId, productId);

  if (isWishlisted) {
    const { error } = await client
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      throw buildServiceError(`Khong the xoa wishlist: ${error.message}`, 500);
    }

    return {
      wishlisted: false,
      product,
    };
  }

  const { error } = await client
    .from('wishlists')
    .insert({
      user_id: userId,
      product_id: productId,
      created_at: new Date().toISOString(),
    });

  if (error) {
    throw buildServiceError(`Khong the them wishlist: ${error.message}`, 500);
  }

  return {
    wishlisted: true,
    product,
  };
}

async function getWishlist(userId, options = {}) {
  const client = getAdminClient();

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));
  const offset = (page - 1) * limit;

  const { data, error, count } = await client
    .from('wishlists')
    .select('product_id, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (isRelationMissing(error, 'wishlists')) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    throw buildServiceError(`Khong the lay wishlist: ${error.message}`, 500);
  }

  const productIds = (data || []).map((entry) => entry.product_id).filter(Boolean);

  if (productIds.length === 0) {
    return {
      items: [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  const { data: products, error: productError } = await client
    .from('products')
    .select('id, seller_id, title, description, price, category, condition, images, image_url, location, status, created_at')
    .in('id', productIds)
    .not('status', 'in', '(hidden,banned)');

  if (productError) {
    throw buildServiceError(`Khong the lay san pham yeu thich: ${productError.message}`, 500);
  }

  const sellerIds = (products || []).map((product) => product.seller_id);
  const profileMap = await fetchProfilesMap(client, sellerIds);

  const productMap = new Map(
    (products || []).map((product) => [
      product.id,
      {
        ...product,
        profiles: profileMap.get(product.seller_id) || null,
      },
    ]),
  );

  return {
    items: (data || []).map((entry) => ({
      product_id: entry.product_id,
      created_at: entry.created_at,
      product: productMap.get(entry.product_id) || null,
    })),
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

module.exports = {
  getWishlist,
  getWishlistStatus,
  toggleWishlist,
};
