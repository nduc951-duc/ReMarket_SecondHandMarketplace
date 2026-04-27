-- ============================================================
-- ReMarket: Profiles & Transactions Tables
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. PROFILES TABLE
-- Stores extended user info (phone, address, bio, avatar)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role can do everything (for backend admin API)
CREATE POLICY "Service role full access on profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid conflict on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- 2. TRANSACTIONS TABLE
-- Stores buy/sell transaction history
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID,
  product_name TEXT NOT NULL DEFAULT '',
  product_image TEXT DEFAULT '',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'completed', 'cancelled')),
  payment_method TEXT DEFAULT '',
  note TEXT DEFAULT '',
  rejection_reason TEXT DEFAULT '',
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can read transactions where they are buyer or seller
CREATE POLICY "Users can read own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Service role can do everything (for backend admin API)
CREATE POLICY "Service role full access on transactions"
  ON public.transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON public.transactions(product_id);


-- 3. PRODUCTS TABLE
-- Stores product listings for the marketplace
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  category TEXT DEFAULT '',
  condition TEXT DEFAULT 'good' CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  images TEXT[] DEFAULT '{}', -- Array of image URLs
  location TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'hidden', 'banned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone can read active products
CREATE POLICY "Anyone can read active products"
  ON public.products FOR SELECT
  USING (status = 'active');

-- Users can read their own products (including hidden/sold/banned)
CREATE POLICY "Users can read own products"
  ON public.products FOR SELECT
  USING (auth.uid() = seller_id);

-- Users can insert their own products
CREATE POLICY "Users can insert own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- Users can update their own products
CREATE POLICY "Users can update own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = seller_id);

-- Users can delete their own products
CREATE POLICY "Users can delete own products"
  ON public.products FOR DELETE
  USING (auth.uid() = seller_id);

-- Service role can do everything (for backend admin API)
CREATE POLICY "Service role full access on products"
  ON public.products FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_created ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);

-- Keep schema aligned with business statuses when re-running migration
UPDATE public.products
SET status = 'hidden'
WHERE status = 'inactive';

UPDATE public.products
SET condition = 'good'
WHERE condition = 'used';

UPDATE public.products
SET condition = 'like_new'
WHERE condition = 'refurbished';

UPDATE public.transactions
SET status = 'confirmed'
WHERE status = 'processing';

UPDATE public.transactions
SET status = 'completed'
WHERE status = 'delivered';

UPDATE public.transactions
SET status = 'cancelled'
WHERE status = 'refunded';

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_status_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'completed', 'cancelled'));

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_condition_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_condition_check
  CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor'));

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_status_check
  CHECK (status IN ('active', 'sold', 'hidden', 'banned'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_product_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Prevent duplicate open orders for the same product (race-condition guard)
CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_open_order_per_product
ON public.transactions(product_id)
WHERE product_id IS NOT NULL
  AND status IN ('pending', 'confirmed');


-- 4. STORAGE BUCKET FOR PRODUCT IMAGES
-- NOTE: You need to create this manually in Supabase Dashboard → Storage
-- Create a bucket named "products" and set it to Public
--
-- Or run this (requires service_role permissions):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
-- ON CONFLICT (id) DO NOTHING;


-- 5. DONE
-- After running this SQL, your backend profile & transaction APIs will work.
-- Make sure to also create the "avatars" storage bucket for profile images in Supabase Dashboard.
