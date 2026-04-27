const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');
const { createNotification } = require('./notificationService');

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

async function createReview({ reviewerId, transactionId, rating, comment }) {
  const client = getAdminClient();
  const normalizedRating = Number(rating);
  const normalizedComment = String(comment || '').trim();

  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw buildServiceError('So sao danh gia phai tu 1 den 5.', 400);
  }

  if (normalizedComment.length > 500) {
    throw buildServiceError('Noi dung danh gia khong duoc vuot qua 500 ky tu.', 400);
  }

  const { data: transaction, error: transactionError } = await client
    .from('transactions')
    .select('id, buyer_id, seller_id, status, product_id, product_name')
    .eq('id', transactionId)
    .maybeSingle();

  if (transactionError) {
    throw buildServiceError(`Khong the lay thong tin giao dich: ${transactionError.message}`, 500);
  }

  if (!transaction) {
    throw buildServiceError('Khong tim thay giao dich.', 404);
  }

  if (transaction.buyer_id !== reviewerId) {
    throw buildServiceError('Chi nguoi mua moi duoc phep danh gia giao dich nay.', 403);
  }

  if (transaction.status !== 'completed') {
    throw buildServiceError('Chi co the danh gia sau khi giao dich hoan thanh.', 400);
  }

  const { data: existingReview, error: existingError } = await client
    .from('reviews')
    .select('id')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    if (isRelationMissing(existingError, 'reviews')) {
      throw buildServiceError('Bang reviews chua duoc tao. Hay chay migration SQL.', 500);
    }
    throw buildServiceError(`Khong the kiem tra danh gia hien tai: ${existingError.message}`, 500);
  }

  if (existingReview) {
    throw buildServiceError('Ban da danh gia giao dich nay roi.', 409);
  }

  const now = new Date().toISOString();
  const insertPayload = {
    transaction_id: transactionId,
    product_id: transaction.product_id,
    reviewer_id: reviewerId,
    reviewed_user_id: transaction.seller_id,
    rating: normalizedRating,
    comment: normalizedComment,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await client
    .from('reviews')
    .insert(insertPayload)
    .select(
      `
      *,
      reviewer_profile:reviewer_id (
        full_name,
        avatar_url
      )
    `,
    )
    .single();

  if (error) {
    if (isRelationMissing(error, 'reviews')) {
      throw buildServiceError('Bang reviews chua duoc tao. Hay chay migration SQL.', 500);
    }

    throw buildServiceError(`Khong the tao danh gia: ${error.message}`, 500);
  }

  if (transaction.seller_id && transaction.seller_id !== reviewerId) {
    try {
      await createNotification({
        user_id: transaction.seller_id,
        type: 'review_received',
        title: 'Ban vua nhan duoc danh gia moi',
        message: `${normalizedRating} sao cho don ${transaction.product_name || 'san pham'}`,
        entity_type: 'transaction',
        entity_id: transactionId,
        metadata: {
          transaction_id: transactionId,
          rating: normalizedRating,
        },
      });
    } catch (notificationError) {
      console.error('Create review notification error:', notificationError);
    }
  }

  return data;
}

async function getReviewsByUser(reviewedUserId, options = {}) {
  const client = getAdminClient();

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
  const offset = (page - 1) * limit;

  const { data, error, count } = await client
    .from('reviews')
    .select(
      `
      id,
      transaction_id,
      product_id,
      reviewer_id,
      reviewed_user_id,
      rating,
      comment,
      created_at,
      reviewer_profile:reviewer_id (
        full_name,
        avatar_url
      ),
      product:product_id (
        id,
        title,
        images
      )
    `,
      { count: 'exact' },
    )
    .eq('reviewed_user_id', reviewedUserId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (isRelationMissing(error, 'reviews')) {
      return {
        reviews: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    throw buildServiceError(`Khong the lay danh sach danh gia: ${error.message}`, 500);
  }

  return {
    reviews: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

async function getReviewForTransaction(transactionId, reviewerId) {
  const client = getAdminClient();

  const { data, error } = await client
    .from('reviews')
    .select('*')
    .eq('transaction_id', transactionId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116' || isRelationMissing(error, 'reviews')) {
      return null;
    }

    throw buildServiceError(`Khong the lay danh gia giao dich: ${error.message}`, 500);
  }

  return data || null;
}

async function getMyReviews(reviewerId, options = {}) {
  const client = getAdminClient();

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
  const offset = (page - 1) * limit;

  const { data, error, count } = await client
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('reviewer_id', reviewerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (isRelationMissing(error, 'reviews')) {
      return {
        reviews: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    throw buildServiceError(`Khong the lay danh sach danh gia cua ban: ${error.message}`, 500);
  }

  return {
    reviews: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

module.exports = {
  createReview,
  getReviewsByUser,
  getReviewForTransaction,
  getMyReviews,
};