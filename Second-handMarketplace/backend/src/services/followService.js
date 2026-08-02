const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = require('../config/env');
const { createNotification } = require('./notificationService');

let adminClient = null;

function buildServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getAdminClient() {
  if (adminClient) return adminClient;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Thieu cau hinh Supabase cho tinh nang theo doi nguoi ban.');
  }
  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

async function getSellerFollowStatus(followerId, sellerId) {
  if (!followerId || !sellerId || followerId === sellerId) return false;
  const { data, error } = await getAdminClient()
    .from('seller_follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (error) throw buildServiceError(`Khong the kiem tra theo doi: ${error.message}`, 500);
  return Boolean(data);
}

async function toggleSellerFollow(followerId, sellerId) {
  if (!sellerId) throw buildServiceError('sellerId la bat buoc.', 400);
  if (followerId === sellerId) {
    throw buildServiceError('Ban khong the theo doi chinh minh.', 400);
  }

  const client = getAdminClient();
  const following = await getSellerFollowStatus(followerId, sellerId);

  if (following) {
    const { error } = await client
      .from('seller_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('seller_id', sellerId);
    if (error) throw buildServiceError(`Khong the bo theo doi: ${error.message}`, 500);
    return { following: false };
  }

  const { error } = await client.from('seller_follows').insert({
    follower_id: followerId,
    seller_id: sellerId,
  });
  if (error) {
    if (error.code === '23505') return { following: true };
    throw buildServiceError(`Khong the theo doi nguoi ban: ${error.message}`, 500);
  }
  return { following: true };
}

async function notifySellerFollowersOfPriceChange({ sellerId, product, oldPrice, newPrice }) {
  if (!sellerId || !product?.id || Number(oldPrice) === Number(newPrice)) return 0;
  const { data, error } = await getAdminClient()
    .from('seller_follows')
    .select('follower_id')
    .eq('seller_id', sellerId);

  if (error) throw buildServiceError(`Khong the lay nguoi theo doi: ${error.message}`, 500);

  const results = await Promise.allSettled(
    (data || []).map(({ follower_id: followerId }) =>
      createNotification({
        user_id: followerId,
        type: 'product_price_changed',
        title: 'Sản phẩm bạn quan tâm vừa đổi giá',
        message: `${product.title || 'Sản phẩm'}: ${Number(oldPrice).toLocaleString('vi-VN')}đ → ${Number(newPrice).toLocaleString('vi-VN')}đ`,
        entity_type: 'product',
        entity_id: product.id,
        metadata: {
          product_id: product.id,
          seller_id: sellerId,
          old_price: Number(oldPrice),
          new_price: Number(newPrice),
        },
      }),
    ),
  );

  return results.filter((result) => result.status === 'fulfilled').length;
}

module.exports = {
  getSellerFollowStatus,
  notifySellerFollowersOfPriceChange,
  toggleSellerFollow,
};
