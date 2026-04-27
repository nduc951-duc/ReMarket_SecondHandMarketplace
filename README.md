# ReMarket - Second-hand Marketplace

ReMarket là nền tảng thương mại điện tử mua bán đồ cũ (Second-hand) an toàn, trực quan và dễ sử dụng. Dự án được phân chia rõ ràng giữa Backend và Frontend, giao tiếp qua RESTful APIs và bảo mật bằng JWT token qua hệ thống Supabase.

Cập nhật mới nhất: Hoàn thiện toàn bộ các tính năng từ FR-01 đến FR-14. Hệ thống đã sẵn sàng cho luồng mua bán hoàn chỉnh.

## 🚀 Công nghệ sử dụng

- **Frontend:** React.js, Vite, React Router DOM, Zustand (State Management), CSS thuần (thiết kế theo phong cách Glassmorphism & UI hiện đại).
- **Backend:** Node.js, Express.js, cấu hình REST API.
- **Database & Auth:** Supabase (PostgreSQL, Supabase Auth, Storage bucket).
- **Mailing:** Nodemailer (Gửi email qua Gmail SMTP).

## ✨ Tính năng hiện tại (Hoàn thiện toàn bộ FR-01 đến FR-14)

### 1. Quản lý tài khoản & Xác thực (FR-01)
- **Đăng ký / Đăng nhập:** Bằng email/mật khẩu hoặc Google OAuth. Gửi email xác nhận đăng ký.
- **Quản lý mật khẩu:** Quên mật khẩu qua email link, đổi mật khẩu trong app.
- **Hồ sơ cá nhân (Profile):** Cập nhật thông tin cơ bản, đổi Avatar (lưu trên Supabase Storage `avatar` bucket).

### 2. Khám phá & Tìm kiếm Sản phẩm (FR-08, FR-09, FR-10)
- **Trang Chủ (Home Page):** Hiển thị lưới sản phẩm với hiệu ứng Skeleton loading mượt mà. Phân trang dữ liệu.
- **Tìm kiếm & Bộ lọc (Search & Filter):** Cho phép lọc sản phẩm theo Danh mục, Tình trạng (Mới, Cũ, ...), Khoảng giá và sắp xếp theo ngày/giá.
- **Chi tiết Sản phẩm (Product Detail):** Xem thông tin chi tiết, thư viện ảnh (gallery), thông tin người bán và các sản phẩm liên quan.

### 3. Giao dịch & Quản lý Đơn hàng (FR-11, FR-12, FR-13)
- **Đặt hàng:** Người mua dễ dàng "Đặt mua" với thông điệp xác nhận rõ ràng.
- **Dashboard Người Bán (Seller Dashboard):** Quản lý các đơn đặt mua, Xác nhận giao hàng hoặc Từ chối đơn (bắt buộc nhập lý do từ chối). Cung cấp các thẻ thống kê KPI.
- **Lịch sử Giao dịch (Transaction History):** Người mua có thể theo dõi đơn hàng, xem chuỗi Timeline trạng thái đơn (Chờ xác nhận -> Đã giao -> Hoàn thành) và "Xác nhận nhận hàng".

### 4. Quản lý Sản phẩm Của Tôi (FR-14)
- **Danh sách (My Products):** Người bán tự quản lý kho sản phẩm của mình, lọc theo trạng thái.
- **Thao tác:** Hỗ trợ Tạo mới, Chỉnh sửa sản phẩm, "Ẩn nhanh" khỏi cửa hàng, và kích hoạt lại sản phẩm dễ dàng. Giao diện upload hỗ trợ nhiều ảnh với chức năng preview/xóa ảnh linh hoạt.

## 🗺️ Client Route Checklist (For Testing)

Frontend base URL:
- http://localhost:5173
- If port 5173 is busy, use: http://localhost:5174

### Auth and Redirect Rules
- `/` -> auto redirect to `/app` (if logged in) or `/login` (if not logged in)
- Auth-only routes (`/login`, `/register`, `/forgot-password`) redirect to `/app` when already logged in
- Protected routes redirect to `/login` when not logged in

### Route List

| Path | Page | Access | Notes |
|---|---|---|---|
| `/` | RootRedirect | Public | Auto route based on auth state |
| `/login` | LoginPage | Auth-only | For users not logged in |
| `/register` | RegisterPage | Auth-only | For new account registration |
| `/forgot-password` | ForgotPasswordPage | Auth-only | Password reset request |
| `/reset-password` | ResetPasswordPage | Public | Usually opened from email link |
| `/app` | ClientHomePage | Protected | Main client home |
| `/profile` | ProfilePage | Protected | User profile |
| `/change-password` | ChangePasswordPage | Protected | Change password |
| `/transactions` | TransactionHistoryPage | Protected | Buyer/seller order history + timeline |
| `/products/:id` | ProductDetailPage | Public | View product details, gallery, and order |
| `/products/:id/edit` | ProductFormPage | Protected | Edit an existing product |
| `/products/new` | ProductFormPage | Protected | Create a product listing |
| `/seller/dashboard` | SellerDashboard | Protected | Seller order management |
| `/my-products` | MyProductsPage | Protected | Seller product management |
| `*` | Fallback redirect | Public | Redirects to `/` |

## 🛠 Cài đặt và Chạy môi trường Development

### 1. Yêu cầu hệ thống
- Node.js (phiên bản 18+ khuyên dùng)
- Tài khoản Supabase
- Tài khoản Gmail (để tạo App Password cho việc gửi email tự động)

### 2. Cài đặt Dependencies

Trước tiên, hãy đảm bảo bạn cài đặt các package cho cả hai thư mục (Frontend & Backend):

```bash
# Ở thư mục backend
cd Second-handMarketplace/backend
npm install

# Ở thư mục frontend
cd Second-handMarketplace/frontend
npm install
```

### 3. Cấu hình Biến môi trường (.env)

**Tạo file `backend/.env` dựa trên `backend/.env.example`:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>

PORT=4000
FRONTEND_ORIGIN=http://localhost:5173

# Gmail SMTP 
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Supabase Auth Admin Level (Quét từ API settings)
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Configs khác
MAIL_FROM_NAME=ReMarket
SIGNUP_CONFIRM_PATH=/login
RESET_PASSWORD_PATH=/reset-password
SIGNUP_COOLDOWN_SECONDS=90
```

**Tạo file `frontend/.env`:**
```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_BACKEND_URL=http://localhost:4000
```

### 4. Thiết lập Database ở Supabase

1. Vào [Supabase SQL Editor](https://supabase.com/dashboard).
2. Copy và chạy toàn bộ mã SQL trong file `backend/supabase_migration.sql` để tạo bảng và các RLS Policies.
3. Vào phần **Storage** tạo một bucket mới tên là `avatar` và đặt nó ở chế độ **Public**.
4. (Tùy chọn) Chạy script DB Seed có sẵn để có 5 users và 15 sản phẩm phục vụ test.

### 5. Chạy dự án

```bash
# Terminal 1 - Khởi chạy Backend
cd Second-handMarketplace/backend
npm run dev

# Terminal 2 - Khởi chạy Frontend
cd Second-handMarketplace/frontend
npm run dev
```
Trang web sẽ tự động bật tại: `http://localhost:5173`.

---
*Developed with modern web tooling to ensure the best UI/UX and stability.*
