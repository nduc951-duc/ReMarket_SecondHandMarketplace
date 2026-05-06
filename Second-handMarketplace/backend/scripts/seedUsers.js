const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const seedUsers = [
  {
    email: 'admin@test.com',
    password: 'Admin@123',
    role: 'admin',
    full_name: 'Admin System',
  },
  {
    email: 'agent@test.com',
    password: 'Agent@123',
    role: 'agent',
    full_name: 'Agent Support',
  },
  {
    email: 'seller@test.com',
    password: 'Seller@123',
    role: 'customer',
    full_name: 'Seller One',
  },
  {
    email: 'buyer@test.com',
    password: 'Buyer@123',
    role: 'customer',
    full_name: 'Buyer One',
  },
  {
    email: 'both@test.com',
    password: 'Both@123',
    role: 'customer',
    full_name: 'Both User',
  },
];

const sellerProducts = [
  {
    title: 'Tai nghe Bluetooth chinh hang',
    description: 'Hang con moi, pin tot, am thanh ro.',
    price: 350000,
    category: 'Dien tu',
    condition: 'like_new',
    images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/f/r/frame_392.png'],
    location: 'TP Ho Chi Minh',
    status: 'active',
  },
  {
    title: 'Balo laptop chong soc 15 inch',
    description: 'Day deo chong soc, vai chong nuoc, dung vua laptop 15 inch.',
    price: 220000,
    category: 'Thoi trang',
    condition: 'good',
    images: ['https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/b/a/balo_laptop_chong_soc_15_inch_1.jpg'],
    location: 'Ha Noi',
    status: 'active',
  },
  {
    title: 'Ban lam viec go trang',
    description: 'Ban nho gon, chiu luc tot, phu hop phong tro.',
    price: 450000,
    category: 'Do gia dung',
    condition: 'good',
    images: ['https://bizweb.dktcdn.net/100/429/325/products/u3.jpg?v=1662696251507'],
    location: 'Da Nang',
    status: 'active',
  },
];

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const user = data?.users?.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      return user;
    }

    if (!data?.users || data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function upsertProfile({ id, email, full_name, role }) {
  const now = new Date().toISOString();
  await adminClient
    .from('profiles')
    .upsert(
      {
        id,
        email,
        full_name,
        role,
        status: 'active',
        updated_at: now,
      },
      { onConflict: 'id' },
    );
}

async function ensureUser({ email, password, role, full_name }) {
  const existing = await findUserByEmail(email);

  if (!existing) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name },
    });

    if (error) {
      throw error;
    }

    await upsertProfile({
      id: data.user.id,
      email,
      full_name,
      role,
    });

    return data.user;
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(existing.id, {
    password,
    user_metadata: { role, full_name },
  });

  if (updateError) {
    throw updateError;
  }

  await upsertProfile({
    id: existing.id,
    email,
    full_name,
    role,
  });

  return existing;
}

async function seedSellerProducts(sellerId) {
  const { count, error } = await adminClient
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId);

  if (error) {
    throw error;
  }

  if ((count || 0) > 0) {
    return;
  }

  const now = new Date().toISOString();
  const payload = sellerProducts.map((item) => ({
    ...item,
    seller_id: sellerId,
    created_at: now,
    updated_at: now,
  }));

  const { error: insertError } = await adminClient.from('products').insert(payload);
  if (insertError) {
    throw insertError;
  }
}

async function run() {
  for (const userSeed of seedUsers) {
    const user = await ensureUser(userSeed);
    if (userSeed.email === 'seller@test.com') {
      await seedSellerProducts(user.id);
    }
  }

  console.log('Seed users completed.');
}

run().catch((error) => {
  console.error('Seed users failed:', error);
  process.exit(1);
});
