const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = require('../../config/env');

let adminClient = null;
let publicClient = null;

function getAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong backend/.env.');
  }

  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

function getPublicClient(accessToken = '') {
  if (publicClient && !accessToken) {
    return publicClient;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Thieu SUPABASE_URL hoac SUPABASE_ANON_KEY trong backend/.env.');
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });

  if (!accessToken) {
    publicClient = client;
  }

  return client;
}

async function fetchProfilesMap(client, userIds) {
  const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, avatar_url, phone, rating_avg, rating_count, verified')
    .in('id', uniqueIds);

  if (error) {
    throw new Error(`Không thể lấy thông tin người bán: ${error.message}`);
  }

  return new Map((data || []).map((profile) => [profile.id, profile]));
}

function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

function normalizeSearchText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function bigrams(value) {
  const text = ` ${normalizeSearchText(value)} `;
  const result = [];
  for (let index = 0; index < text.length - 1; index += 1) {
    result.push(text.slice(index, index + 2));
  }
  return result;
}

function diceSimilarity(left, right) {
  const leftPairs = bigrams(left);
  const rightPairs = bigrams(right);
  if (!leftPairs.length || !rightPairs.length) return 0;
  const remaining = [...rightPairs];
  let matches = 0;
  leftPairs.forEach((pair) => {
    const index = remaining.indexOf(pair);
    if (index >= 0) {
      matches += 1;
      remaining.splice(index, 1);
    }
  });
  return (2 * matches) / (leftPairs.length + rightPairs.length);
}

function searchTokens(value) {
  return normalizeSearchText(value).split(' ').filter(Boolean);
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function tokenSimilarity(left, right) {
  if (left === right) return 1;
  if (Math.min(left.length, right.length) < 4) return 0;

  const distance = editDistance(left, right);
  const longestLength = Math.max(left.length, right.length);
  if (distance === 1) return 0.9;
  if (distance / longestLength <= 0.25) return 0.75;

  const similarity = diceSimilarity(left, right);
  return similarity >= 0.72 ? similarity : 0;
}

const PRODUCT_SEARCH_SYNONYMS = {
  camera: ['may anh', 'may chup anh'],
  'dien thoai': ['smartphone', 'iphone', 'android'],
  laptop: ['may tinh xach tay', 'notebook'],
  'tai nghe': ['headphone', 'earphone'],
  'xe may': ['motorbike', 'scooter'],
};

function searchAlternatives(search) {
  const normalized = normalizeSearchText(search);
  const alternatives = [normalized];
  const normalizedTokens = searchTokens(normalized);
  Object.entries(PRODUCT_SEARCH_SYNONYMS).forEach(([term, synonyms]) => {
    const containsTerm = normalized.includes(term);
    const containsSynonym = synonyms.some((synonym) => normalized.includes(synonym));
    const nearSingleWordTerm =
      !term.includes(' ') && normalizedTokens.some((token) => tokenSimilarity(token, term) >= 0.75);

    if (containsTerm || nearSingleWordTerm) alternatives.push(...synonyms);
    if (containsSynonym) alternatives.push(term);
  });
  return Array.from(new Set(alternatives));
}

function scoreProductMatch(search, product) {
  const normalizedTitle = normalizeSearchText(product.title);
  const normalizedDescription = normalizeSearchText(product.description);
  const titleTokens = searchTokens(normalizedTitle);
  const descriptionTokens = searchTokens(normalizedDescription);

  return Math.max(
    ...searchAlternatives(search).map((normalizedQuery) => {
      const queryTokens = searchTokens(normalizedQuery).filter((token) => token.length >= 2);
      if (!queryTokens.length) return 0;

      const bestScores = (candidateTokens) =>
        queryTokens.map((queryToken) =>
          candidateTokens.reduce(
            (best, candidateToken) => Math.max(best, tokenSimilarity(queryToken, candidateToken)),
            0,
          ),
        );
      const titleScores = bestScores(titleTokens);
      const descriptionScores = bestScores(descriptionTokens);
      const matchedTokenRatio =
        queryTokens.filter(
          (_token, index) => Math.max(titleScores[index], descriptionScores[index]) >= 0.75,
        ).length / queryTokens.length;
      const requiredRatio = queryTokens.length === 1 ? 1 : 0.75;

      if (matchedTokenRatio < requiredRatio) return 0;

      const average = (scores) =>
        scores.reduce((total, score) => total + score, 0) / Math.max(1, scores.length);
      const titleCoverage = average(titleScores);
      const descriptionCoverage = average(descriptionScores);
      const titleExactBonus = normalizedTitle.includes(normalizedQuery) ? 0.35 : 0;
      const descriptionExactBonus = normalizedDescription.includes(normalizedQuery) ? 0.2 : 0;

      return (
        Math.max(titleCoverage, descriptionCoverage * 0.85) +
        titleExactBonus +
        descriptionExactBonus
      );
    }),
  );
}

/**
 * Create a new product
 * @param {object} productData - { seller_id, title, description, price, category, condition, images, location }
 */
async function createProduct(productData) {
  const client = getAdminClient();

  const { data, error } = await client.from('products').insert([productData]).select().single();

  if (error) {
    throw new Error(`Không thể tạo sản phẩm: ${error.message}`);
  }

  return data;
}

/**
 * Get product by ID
 * @param {string} productId
 */
async function getProductByIdWithClient(client, productId) {
  const { data, error } = await client.from('products').select('*').eq('id', productId).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Product not found
    }
    throw new Error(`Không thể lấy sản phẩm: ${error.message}`);
  }

  const profileMap = await fetchProfilesMap(client, [data?.seller_id]);

  return {
    ...data,
    profiles: profileMap.get(data?.seller_id) || null,
  };
}

async function getProductById(productId) {
  const client = getAdminClient();
  return getProductByIdWithClient(client, productId);
}

async function getPublicProductById(productId, accessToken = '') {
  const client = getPublicClient(accessToken);
  const admin = getAdminClient();

  const { data, error } = await client.from('products').select('*').eq('id', productId).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Không thể lấy sản phẩm: ${error.message}`);
  }

  const profileMap = await fetchProfilesMap(admin, [data?.seller_id]);

  return {
    ...data,
    profiles: profileMap.get(data?.seller_id) || null,
  };
}

/**
 * Get products with pagination and filters
 * @param {object} options - { page, limit, category, condition, status, seller_id, search }
 */
async function getProductsWithClient(client, options = {}) {
  const admin = getAdminClient();

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
  const offset = (page - 1) * limit;

  // Use Full-Text Search RPC if search query is provided
  if (options.search) {
    return searchProductsRPC(client, options, admin);
  }

  const inStock = parseBoolean(options.in_stock, true);
  const categories = parseCsv(options.category);
  const conditions = parseCsv(options.condition);
  const hasImages = parseBoolean(options.has_images, false);
  const verifiedSeller = parseBoolean(options.verified_seller, false);
  const negotiable = parseBoolean(options.negotiable, false);

  let query = client.from('products').select('*', { count: 'exact' });

  if (inStock) {
    query = query.eq('status', 'active');
  } else {
    query = query.in('status', ['active', 'sold']);
  }

  // Apply filters
  if (categories.length > 0) {
    query = query.in('category', categories);
  }

  if (conditions.length > 0) {
    query = query.in('condition', conditions);
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

  if (options.city) {
    query = query.ilike('location', `%${options.city}%`);
  }

  if (options.district) {
    query = query.ilike('location', `%${options.district}%`);
  }

  if (options.posted_within) {
    const now = new Date();
    let startTime = null;

    if (String(options.posted_within) === 'today') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      const days = Number(options.posted_within);
      if (Number.isFinite(days) && days > 0) {
        startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      }
    }

    if (startTime) {
      query = query.gte('created_at', startTime.toISOString());
    }
  }

  if (hasImages) {
    query = query.or('image_url.not.is.null,images.not.is.null');
  }

  if (negotiable) {
    query = query.eq('is_negotiable', true);
  }

  if (verifiedSeller) {
    const { data: verifiedProfiles, error: verifiedError } = await admin
      .from('profiles')
      .select('id')
      .eq('verified', true);

    if (verifiedError) {
      throw new Error(`Khong the loc nguoi ban xac minh: ${verifiedError.message}`);
    }

    const sellerIds = (verifiedProfiles || []).map((item) => item.id);
    if (sellerIds.length === 0) {
      return {
        products: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    query = query.in('seller_id', sellerIds);
  }

  let sortField = 'created_at';
  let ascending = false;
  const sort = options.sort || 'newest';

  if (sort === 'oldest') {
    ascending = true;
  } else if (sort === 'price_asc') {
    sortField = 'price';
    ascending = true;
  } else if (sort === 'price_desc') {
    sortField = 'price';
  } else if (sort === 'view_desc') {
    sortField = 'view_count';
  } else if (sort === 'comment_desc') {
    sortField = 'comment_count';
  } else if (sort === 'rating_desc') {
    sortField = 'avg_rating';
  } else if (sort === 'today') {
    sortField = 'created_at';
  }

  if (sort === 'today' && !options.posted_within) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    query = query.gte('created_at', startOfDay.toISOString());
  }

  query = query.order(sortField, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Không thể lấy danh sách sản phẩm: ${error.message}`);
  }

  const profileMap = await fetchProfilesMap(
    admin,
    (data || []).map((item) => item.seller_id),
  );

  const products = (data || []).map((item) => ({
    ...item,
    profiles: profileMap.get(item.seller_id) || null,
  }));

  return {
    products,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

async function searchProductsRPC(client, options, admin) {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
  const offset = (page - 1) * limit;

  let postedWithin = null;
  if (options.posted_within === 'today') postedWithin = 0;
  else if (Number(options.posted_within) > 0) postedWithin = Number(options.posted_within);

  const { data, error } = await client.rpc('search_products', {
    search_query: options.search,
    filter_categories: parseCsv(options.category).length ? parseCsv(options.category) : null,
    filter_conditions: parseCsv(options.condition).length ? parseCsv(options.condition) : null,
    filter_min_price: options.min_price !== undefined ? Number(options.min_price) : null,
    filter_max_price: options.max_price !== undefined ? Number(options.max_price) : null,
    filter_city: options.city || null,
    filter_district: options.district || null,
    filter_posted_within: postedWithin,
    filter_has_images: parseBoolean(options.has_images, false),
    filter_verified_seller: parseBoolean(options.verified_seller, false),
    filter_in_stock: parseBoolean(options.in_stock, true),
    filter_negotiable: parseBoolean(options.negotiable, false),
    filter_seller_id: options.seller_id || null,
    sort_by: options.sort || 'relevance',
    page_offset: offset,
    page_limit: limit,
  });

  if (error || !data?.length) return fuzzySearchProducts(client, options, admin);

  const profileMap = await fetchProfilesMap(
    admin,
    (data || []).map((item) => item.seller_id),
  );

  const products = (data || []).map((item) => ({
    ...item,
    profiles: profileMap.get(item.seller_id) || null,
  }));

  const totalCount = data?.[0]?.total_count || 0;
  return {
    products: products,
    pagination: {
      page,
      limit,
      total: Number(totalCount),
      totalPages: Math.ceil(Number(totalCount) / limit),
    },
  };
}

async function fuzzySearchProducts(client, options, admin) {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
  const offset = (page - 1) * limit;
  let query = client.from('products').select('*').eq('status', 'active').limit(150);

  const categories = parseCsv(options.category);
  const conditions = parseCsv(options.condition);
  if (categories.length) query = query.in('category', categories);
  if (conditions.length) query = query.in('condition', conditions);
  if (options.min_price !== undefined && options.min_price !== '') {
    query = query.gte('price', Number(options.min_price));
  }
  if (options.max_price !== undefined && options.max_price !== '') {
    query = query.lte('price', Number(options.max_price));
  }
  if (options.city) query = query.ilike('location', `%${options.city}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Fuzzy search failed: ${error.message}`);

  const ranked = (data || [])
    .map((product) => ({ ...product, relevance_score: scoreProductMatch(options.search, product) }))
    .filter((product) => product.relevance_score >= 0.65)
    .sort((left, right) => right.relevance_score - left.relevance_score);
  const pageRows = ranked.slice(offset, offset + limit);
  const profileMap = await fetchProfilesMap(
    admin,
    pageRows.map((item) => item.seller_id),
  );

  return {
    products: pageRows.map((item) => ({
      ...item,
      profiles: profileMap.get(item.seller_id) || null,
    })),
    pagination: {
      page,
      limit,
      total: ranked.length,
      totalPages: Math.ceil(ranked.length / limit),
      matchMode: 'fuzzy',
    },
  };
}

async function autocompleteProducts(query) {
  const client = getAdminClient();
  let { data, error } = await client.rpc('smart_product_suggestions', {
    query_text: query,
    max_results: 6,
  });

  if (error) {
    ({ data, error } = await client.rpc('autocomplete_products', {
      query_text: query,
      max_results: 6,
    }));
  }

  if (!error && data?.length) return data;
  const result = await fuzzySearchProducts(client, { search: query, limit: 6 }, client);
  return result.products.map(({ id, title, category, price }) => ({ id, title, category, price }));
}

async function getProducts(options = {}) {
  const client = getAdminClient();
  return getProductsWithClient(client, options);
}

async function getPublicProducts(options = {}, accessToken = '') {
  const client = getPublicClient(accessToken);
  return getProductsWithClient(client, options);
}

async function incrementProductViewCount(productId) {
  const client = getAdminClient();

  const { error } = await client.rpc('increment_product_view_count', {
    product_id: productId,
  });

  if (error) {
    throw new Error(`Khong the tang luot xem: ${error.message}`);
  }
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
async function getProductsBySellerWithClient(client, sellerId, options = {}) {
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

async function getProductsBySeller(sellerId, options = {}) {
  const client = getAdminClient();
  return getProductsBySellerWithClient(client, sellerId, options);
}

async function getPublicProductsBySeller(sellerId, options = {}, accessToken = '') {
  const client = getPublicClient(accessToken);
  return getProductsBySellerWithClient(client, sellerId, options);
}

module.exports = {
  createProduct,
  getProductById,
  getPublicProductById,
  getProducts,
  getPublicProducts,
  incrementProductViewCount,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
  getPublicProductsBySeller,
  hasOpenTransactionsForProduct,
  autocompleteProducts,
  scoreProductMatch,
};
