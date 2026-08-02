# Supabase marketplace upgrade

Các migration dưới đây đều idempotent và được thiết kế để chạy trong Supabase
SQL Editor. Không đưa service-role key hoặc thông tin kết nối database vào commit.

## Thứ tự áp dụng

1. Chạy toàn bộ `supabase_product_transaction_reviews.sql`.
2. Chạy toàn bộ `supabase_seller_follows.sql`.
3. Chạy toàn bộ `supabase_smart_product_search.sql`.
4. Chạy toàn bộ `supabase_vector_rag.sql`.
5. Chạy `NOTIFY pgrst, 'reload schema';` nếu schema cache chưa tự reload.

## Chức năng của từng migration

- Product comments gắn review với transaction hoàn tất, backfill product ID và
  không tin buyer, seller hoặc product ID do client gửi.
- Seller follows chống theo dõi trùng/tự theo dõi và chỉ cho backend ghi dữ liệu.
- Smart search thêm unaccent/pg_trgm cho lỗi chính tả và gần đúng.
- Vector RAG thêm pgvector, HNSW, knowledge chunks, product embeddings, queue có
  lock/retry/version và hybrid RPC kết hợp full-text với semantic similarity.

## Kiểm tra schema live

Từ thư mục `backend` chạy:

```bash
npm run supabase:verify-marketplace
```

Lệnh phải in năm dòng `PASS`. Nó chỉ đọc schema, không in credentials hoặc dữ
liệu người dùng.

## Khởi tạo vector RAG

Sau khi migration thứ tư thành công, cấu hình backend:

```env
VECTOR_RAG_ENABLED=true
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSIONS=1536
EMBEDDING_VERSION=1
EMBEDDING_BATCH_SIZE=10
EMBEDDING_WORKER_INTERVAL_MS=5000
```

Đồng bộ knowledge base, backfill embeddings và chạy evaluation:

```bash
npm run rag:sync-knowledge
npm run worker:embeddings:once
npm run rag:evaluate -- --require-vector
```

Nếu còn nhiều job pending, tiếp tục chạy `worker:embeddings:once` hoặc khởi động
worker dài hạn:

```bash
npm run worker:embeddings
```

Khi deploy, embedding worker phải là process riêng. Không khởi động worker từ
Express app và không đưa `GEMINI_API_KEY` xuống frontend. Groq tiếp tục đảm nhiệm
phần sinh câu trả lời; Gemini chỉ tạo vector retrieval.

## Quyền riêng tư và chi phí provider

- Migration và hybrid RPC chạy trong Supabase, không tự gửi dữ liệu ra ngoài.
- Embedding worker gửi `searchable_text` của sản phẩm và knowledge chunks đến Gemini.
  Không đưa email, access token, service-role key hoặc thông tin thanh toán vào nội dung này.
- Mỗi truy vấn vector tạo một query embedding; đây là external egress và có thể phát sinh
  quota Free Tier. Dữ liệu gửi qua Gemini Free Tier có thể được dùng để cải thiện sản phẩm
  của Google; không đưa dữ liệu cá nhân hoặc thanh toán vào embedding payload.
- Process production cho embedding worker cần được khai báo riêng trên Render/Railway sau
  khi có phê duyệt trên; API vẫn an toàn ở `lexical_fallback` khi vector bị tắt.

## Smoke test

```text
GET  /api/reviews/product/:productId
GET  /api/products/autocomplete?q=camra
GET  /api/follows/sellers/:sellerId/status   (Bearer token bắt buộc)
POST /api/ai-support/chat
```

AI response phải có `retrieval.mode = hybrid_vector`, danh sách `sources`, product
ID thật và không được trả sản phẩm ngoài hard filter giá/trạng thái/vị trí.
