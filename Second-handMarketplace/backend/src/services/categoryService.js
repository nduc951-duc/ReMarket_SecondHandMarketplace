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

async function getCategories() {
  const client = getAdminClient();

  const [{ data: categories, error: categoryError }, { data: products, error: productError }] = await Promise.all([
    client
      .from('categories')
      .select('id, name, slug, image_url, created_at')
      .order('id', { ascending: true }),
    client
      .from('products')
      .select('category')
      .eq('status', 'active'),
  ]);

  if (categoryError) {
    throw new Error(`Khong the lay danh muc: ${categoryError.message}`);
  }

  if (productError) {
    throw new Error(`Khong the dem san pham theo danh muc: ${productError.message}`);
  }

  const countMap = (products || []).reduce((acc, product) => {
    if (!product.category) return acc;
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {});

  return (categories || []).map((category) => ({
    ...category,
    count: countMap[category.name] || 0,
  }));
}

module.exports = {
  getCategories,
};
