
-- 0. CLEANUP OLD INCOMPATIBLE TABLES
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.wishlists CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'good';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_seller_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;


-- 2. DROP ALL EXISTING POLICIES TO PREVENT "ALREADY EXISTS" ERROR
DO $$ 
DECLARE
  pol_rec RECORD;
BEGIN
  FOR pol_rec IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_rec.policyname, pol_rec.tablename);
  END LOOP;
END $$;

-- ==========================================
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
  email TEXT DEFAULT '',
  role TEXT DEFAULT 'customer',
  status TEXT DEFAULT 'active',
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
  INSERT INTO public.profiles (id, full_name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    'active'
  );
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
WHERE status::text = 'inactive';

UPDATE public.products
SET condition = 'good'
WHERE condition::text = 'used';

UPDATE public.products
SET condition = 'like_new'
WHERE condition::text = 'refurbished';

UPDATE public.transactions
SET status = 'confirmed'
WHERE status::text = 'processing';

UPDATE public.transactions
SET status = 'completed'
WHERE status::text = 'delivered';

UPDATE public.transactions
SET status = 'cancelled'
WHERE status::text = 'refunded';

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


-- ============================================================
-- 6. CHAT / REALTIME TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read own conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on conversations"
  ON public.conversations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Participants can read participant rows"
  ON public.conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own participant row"
  ON public.conversation_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own participant row"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on conversation participants"
  ON public.conversation_participants FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Participants can read messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = chat_messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can insert own messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = chat_messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on chat messages"
  ON public.chat_messages FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_conversations_updated
  ON public.conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_product
  ON public.conversations(product_id);

CREATE INDEX IF NOT EXISTS idx_participants_user
  ON public.conversation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.chat_messages(conversation_id, created_at DESC);


-- ============================================================
-- 7. REVIEW SYSTEM
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  reviewed_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ux_reviews_transaction UNIQUE (transaction_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can insert own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Service role full access on reviews"
  ON public.reviews FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user
  ON public.reviews(reviewed_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer
  ON public.reviews(reviewer_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.refresh_profile_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_user UUID;
BEGIN
  target_user := COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);

  IF target_user IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.profiles p
  SET
    rating_avg = COALESCE(summary.avg_rating, 0),
    rating_count = COALESCE(summary.total_reviews, 0),
    updated_at = NOW()
  FROM (
    SELECT
      reviewed_user_id,
      ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating,
      COUNT(*)::INT AS total_reviews
    FROM public.reviews
    WHERE reviewed_user_id = target_user
    GROUP BY reviewed_user_id
  ) AS summary
  WHERE p.id = target_user;

  IF NOT FOUND THEN
    UPDATE public.profiles
    SET
      rating_avg = 0,
      rating_count = 0,
      updated_at = NOW()
    WHERE id = target_user;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reviews_refresh_profile_rating ON public.reviews;

CREATE TRIGGER trg_reviews_refresh_profile_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_profile_rating();


-- ============================================================
-- 8. WISHLIST
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wishlists (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wishlist"
  ON public.wishlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist"
  ON public.wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist"
  ON public.wishlists FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on wishlists"
  ON public.wishlists FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_wishlists_user_created
  ON public.wishlists(user_id, created_at DESC);


-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  entity_type TEXT DEFAULT '',
  entity_id TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on notifications"
  ON public.notifications FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read);
