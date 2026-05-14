-- Seed marketplace products using the existing category taxonomy.
-- Run in Supabase SQL Editor.
--
-- Requirement:
-- - At least two rows should exist in auth.users for testing buyer/seller flows.
-- - Products are assigned to users that are NOT profile full_name = 'Trần Hữu Đức'.
--
-- This script does NOT create duplicate categories. It only updates image_url
-- for your existing category slugs and inserts products mapped to those rows.

UPDATE public.categories
SET image_url = CASE slug
  WHEN 'dien-thoai-may-tinh-bang' THEN 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80'
  WHEN 'may-tinh-laptop' THEN 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80'
  WHEN 'thoi-trang-phu-kien' THEN 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80'
  WHEN 'sach-tai-lieu' THEN 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80'
  WHEN 'do-gia-dung' THEN 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80'
  WHEN 'phuong-tien-di-chuyen' THEN 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80'
  WHEN 'the-thao-da-ngoai' THEN 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80'
  WHEN 'khac' THEN 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=80'
  ELSE image_url
END
WHERE slug IN (
  'dien-thoai-may-tinh-bang',
  'may-tinh-laptop',
  'thoi-trang-phu-kien',
  'sach-tai-lieu',
  'do-gia-dung',
  'phuong-tien-di-chuyen',
  'the-thao-da-ngoai',
  'khac'
);

WITH seller_pool AS (
  SELECT
    u.id,
    row_number() OVER (ORDER BY u.created_at ASC, u.id ASC) AS seller_index
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.f_unaccent(lower(COALESCE(p.full_name, ''))) <> public.f_unaccent(lower('Trần Hữu Đức'))
),
seller_count AS (
  SELECT count(*)::integer AS total FROM seller_pool
),
seed_products AS (
  SELECT *
  FROM (
    VALUES
      (
        'iPhone 13 Pro 128GB màu Graphite',
        'Máy hoạt động ổn định, pin tốt, ngoại hình đẹp, phù hợp dùng hằng ngày.',
        12900000::bigint,
        'dien-thoai-may-tinh-bang',
        'like_new'::product_condition,
        'TP.HCM',
        'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=900&q=80',
        2560,
        true
      ),
      (
        'iPad Air 5 WiFi 64GB còn đẹp',
        'Máy ít dùng, màn hình sáng đẹp, dùng học tập và ghi chú rất ổn.',
        10900000::bigint,
        'dien-thoai-may-tinh-bang',
        'good'::product_condition,
        'Hà Nội',
        'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80',
        1340,
        true
      ),
      (
        'MacBook Air M2 13 inch còn bảo hành',
        'Máy đẹp, pin tốt, dùng văn phòng và học tập rất ổn. Có sạc zin đi kèm.',
        18900000::bigint,
        'may-tinh-laptop',
        'like_new'::product_condition,
        'TP.HCM',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
        2840,
        true
      ),
      (
        'Laptop Dell XPS 13 màn hình 2K',
        'Máy mỏng nhẹ, bàn phím tốt, phù hợp làm việc di động.',
        16500000::bigint,
        'may-tinh-laptop',
        'good'::product_condition,
        'Đà Nẵng',
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80',
        970,
        true
      ),
      (
        'Áo khoác denim local brand size M',
        'Áo ít mặc, form rộng vừa, vải dày, không rách hoặc phai màu.',
        390000::bigint,
        'thoi-trang-phu-kien',
        'like_new'::product_condition,
        'Đà Nẵng',
        'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?auto=format&fit=crop&w=900&q=80',
        620,
        false
      ),
      (
        'Túi da đeo chéo màu nâu',
        'Túi còn mới, khóa kéo tốt, da mềm, hợp đi làm hoặc đi chơi.',
        450000::bigint,
        'thoi-trang-phu-kien',
        'good'::product_condition,
        'TP.HCM',
        'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80',
        430,
        false
      ),
      (
        'Bộ sách thiết kế UX UI tiếng Anh',
        'Sách còn mới, không ghi chú nhiều, gồm các đầu sách về research và product design.',
        520000::bigint,
        'sach-tai-lieu',
        'like_new'::product_condition,
        'Hà Nội',
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80',
        410,
        false
      ),
      (
        'Giáo trình IELTS Cambridge trọn bộ',
        'Sách luyện thi còn sạch, đầy đủ nhiều cấp độ, phù hợp tự học.',
        320000::bigint,
        'sach-tai-lieu',
        'good'::product_condition,
        'Cần Thơ',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80',
        360,
        false
      ),
      (
        'Ghế công thái học full lưới ngả sâu',
        'Ghế còn chắc chắn, lưng lưới thoáng, phù hợp làm việc tại nhà.',
        1850000::bigint,
        'do-gia-dung',
        'good'::product_condition,
        'TP.HCM',
        'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=80',
        1250,
        true
      ),
      (
        'Bàn ăn gỗ sồi 4 ghế phong cách Bắc Âu',
        'Bộ bàn ăn còn đẹp, mặt bàn chắc, phù hợp căn hộ nhỏ.',
        2600000::bigint,
        'do-gia-dung',
        'good'::product_condition,
        'Hà Nội',
        'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=900&q=80',
        980,
        true
      ),
      (
        'Honda SH Mode 2022 chính chủ',
        'Xe chính chủ, giấy tờ đầy đủ, máy êm, bảo dưỡng định kỳ.',
        48500000::bigint,
        'phuong-tien-di-chuyen',
        'good'::product_condition,
        'TP.HCM',
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80',
        3120,
        true
      ),
      (
        'Xe đạp địa hình Giant ATX bánh 27.5',
        'Xe chạy ổn, phanh và đề hoạt động tốt, phù hợp đi phố hoặc đường nhẹ.',
        4200000::bigint,
        'the-thao-da-ngoai',
        'good'::product_condition,
        'Bình Dương',
        'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80',
        1760,
        true
      ),
      (
        'Giày chạy bộ Nike Pegasus 40 size 42',
        'Giày chạy ít, đế còn tốt, phù hợp tập luyện hàng ngày.',
        1150000::bigint,
        'the-thao-da-ngoai',
        'like_new'::product_condition,
        'TP.HCM',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
        540,
        false
      ),
      (
        'Đèn bàn decor kim loại ánh sáng ấm',
        'Đèn hoạt động tốt, ánh sáng ấm, phù hợp bàn làm việc hoặc phòng ngủ.',
        280000::bigint,
        'khac',
        'good'::product_condition,
        'Đà Nẵng',
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80',
        310,
        false
      )
  ) AS product_seed(title, description, price, category_slug, condition, location, image_url, view_count, is_negotiable)
),
numbered_products AS (
  SELECT
    seed_products.*,
    row_number() OVER (ORDER BY seed_products.title ASC) AS product_index
  FROM seed_products
),
prepared_products AS (
  SELECT
    numbered_products.*,
    seller_pool.id AS seller_id
  FROM numbered_products
  CROSS JOIN seller_count
  JOIN seller_pool
    ON seller_pool.seller_index = ((numbered_products.product_index - 1) % seller_count.total) + 1
  WHERE seller_count.total > 0
)
INSERT INTO public.products (
  seller_id,
  category_id,
  title,
  description,
  price,
  category,
  condition,
  status,
  location,
  image_url,
  images,
  view_count,
  is_negotiable
)
SELECT
  prepared_products.seller_id,
  categories.id,
  prepared_products.title,
  prepared_products.description,
  prepared_products.price,
  categories.name,
  prepared_products.condition,
  'active'::product_status,
  prepared_products.location,
  prepared_products.image_url,
  ARRAY[prepared_products.image_url],
  prepared_products.view_count,
  prepared_products.is_negotiable
FROM prepared_products
JOIN public.categories ON categories.slug = prepared_products.category_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.products existing
  WHERE existing.title = prepared_products.title
);

-- Reassign existing seeded rows away from Trần Hữu Đức as well.
WITH seller_pool AS (
  SELECT
    u.id,
    row_number() OVER (ORDER BY u.created_at ASC, u.id ASC) AS seller_index
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.f_unaccent(lower(COALESCE(p.full_name, ''))) <> public.f_unaccent(lower('Trần Hữu Đức'))
),
seller_count AS (
  SELECT count(*)::integer AS total FROM seller_pool
),
seed_titles AS (
  SELECT *
  FROM (
    VALUES
      ('iPhone 13 Pro 128GB màu Graphite'),
      ('iPad Air 5 WiFi 64GB còn đẹp'),
      ('MacBook Air M2 13 inch còn bảo hành'),
      ('Laptop Dell XPS 13 màn hình 2K'),
      ('Áo khoác denim local brand size M'),
      ('Túi da đeo chéo màu nâu'),
      ('Bộ sách thiết kế UX UI tiếng Anh'),
      ('Giáo trình IELTS Cambridge trọn bộ'),
      ('Ghế công thái học full lưới ngả sâu'),
      ('Bàn ăn gỗ sồi 4 ghế phong cách Bắc Âu'),
      ('Honda SH Mode 2022 chính chủ'),
      ('Xe đạp địa hình Giant ATX bánh 27.5'),
      ('Giày chạy bộ Nike Pegasus 40 size 42'),
      ('Đèn bàn decor kim loại ánh sáng ấm'),
      ('MacBook Air M2 13 inch còn bảo hành Apple'),
      ('Máy ảnh Fujifilm X-T30 kèm lens kit'),
      ('Tai nghe Sony WH-1000XM5 màu đen'),
      ('Căn hộ studio full nội thất gần trung tâm')
  ) AS title_list(title)
),
ranked_products AS (
  SELECT
    p.id,
    row_number() OVER (ORDER BY p.title ASC, p.id ASC) AS product_index
  FROM public.products p
  JOIN seed_titles ON seed_titles.title = p.title
),
assigned_products AS (
  SELECT
    ranked_products.id AS product_id,
    seller_pool.id AS seller_id
  FROM ranked_products
  CROSS JOIN seller_count
  JOIN seller_pool
    ON seller_pool.seller_index = ((ranked_products.product_index - 1) % seller_count.total) + 1
  WHERE seller_count.total > 0
)
UPDATE public.products p
SET seller_id = assigned_products.seller_id
FROM assigned_products
WHERE p.id = assigned_products.product_id;

-- Cleanup duplicate categories created by the previous seed version.
WITH category_map AS (
  SELECT *
  FROM (
    VALUES
      ('dien-tu', 'may-tinh-laptop'),
      ('thoi-trang', 'thoi-trang-phu-kien'),
      ('sach-vo', 'sach-tai-lieu'),
      ('the-thao', 'the-thao-da-ngoai'),
      ('o-to-xe-may', 'phuong-tien-di-chuyen'),
      ('bat-dong-san', 'khac')
  ) AS mapped(old_slug, new_slug)
),
resolved_categories AS (
  SELECT
    old_category.id AS old_id,
    old_category.name AS old_name,
    new_category.id AS new_id,
    new_category.name AS new_name
  FROM category_map
  JOIN public.categories old_category ON old_category.slug = category_map.old_slug
  JOIN public.categories new_category ON new_category.slug = category_map.new_slug
)
UPDATE public.products p
SET
  category_id = resolved_categories.new_id,
  category = resolved_categories.new_name
FROM resolved_categories
WHERE p.category_id = resolved_categories.old_id
  OR p.category = resolved_categories.old_name;

DELETE FROM public.categories c
WHERE c.slug IN ('dien-tu', 'thoi-trang', 'sach-vo', 'the-thao', 'o-to-xe-may', 'bat-dong-san')
  AND NOT EXISTS (
    SELECT 1 FROM public.products p WHERE p.category_id = c.id
  );

-- For buyer-flow testing: move products owned by profile "Trần Hữu Đức"
-- to other sellers. If no other sellers exist, this block changes nothing.
WITH current_owner AS (
  SELECT id
  FROM public.profiles
  WHERE public.f_unaccent(lower(COALESCE(full_name, ''))) = public.f_unaccent(lower('Trần Hữu Đức'))
  LIMIT 1
),
seller_pool AS (
  SELECT
    u.id,
    row_number() OVER (ORDER BY u.created_at ASC, u.id ASC) AS seller_index
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.f_unaccent(lower(COALESCE(p.full_name, ''))) <> public.f_unaccent(lower('Trần Hữu Đức'))
),
seller_count AS (
  SELECT count(*)::integer AS total FROM seller_pool
),
owner_products AS (
  SELECT
    p.id,
    row_number() OVER (ORDER BY p.created_at DESC, p.id ASC) AS product_index
  FROM public.products p
  JOIN current_owner ON current_owner.id = p.seller_id
),
assigned_products AS (
  SELECT
    owner_products.id AS product_id,
    seller_pool.id AS seller_id
  FROM owner_products
  CROSS JOIN seller_count
  JOIN seller_pool
    ON seller_pool.seller_index = ((owner_products.product_index - 1) % seller_count.total) + 1
  WHERE seller_count.total > 0
)
UPDATE public.products p
SET seller_id = assigned_products.seller_id
FROM assigned_products
WHERE p.id = assigned_products.product_id;
