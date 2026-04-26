# ReMarket - Second-hand Marketplace

ReMarket là nền tảng thương mại điện tử mua bán đồ cũ (Second-hand) an toàn, trực quan và dễ sử dụng. Dự án được phân chia rõ ràng giữa Backend và Frontend, giao tiếp qua RESTful APIs và bảo mật bằng JWT token qua hệ thống Supabase.

## 🚀 Công nghệ sử dụng

- **Frontend:** React.js, Vite, React Router DOM, Zustand (State Management), CSS thuần (thiết kế theo phong cách Glassmorphism & UI hiện đại).
- **Backend:** Node.js, Express.js, cấu hình REST API.
- **Database & Auth:** Supabase (PostgreSQL, Supabase Auth, Storage bucket).
- **Mailing:** Nodemailer (Gửi email qua Gmail SMTP).

## ✨ Tính năng hiện tại (FR-01: Quản lý tài khoản)

- **Đăng ký / Đăng nhập:**
  - Qua hệ thống email + mật khẩu.
  - Quản lý xác thực email qua mã gửi đến hòm thư (Gmail SMTP integration).
  - Có tính năng **Gửi lại email xác nhận**.
  - Đăng nhập dạng Google OAuth (Có sẵn qua Supabase).
- **Quản lý mật khẩu:**
  - Tính năng quên mật khẩu & đặt lại mật khẩu mới thông qua email link.
  - Tính năng đổi mật khẩu bên trong app (cần nhập mật khẩu cũ).
- **Quản lý hồ sơ cá nhân (Profile):**
  - Hiển thị thông tin người dùng: Tên, SĐT, Địa chỉ, Tiểu sử (Bio), và ngày tham gia.
  - Upload Avatar trực tiếp đổi ảnh đại diện (Lưu trên Supabase Storage `avatar` bucket) với giới hạn 5MB và định dạng chuẩn (JPG, PNG).
- **Quản lý lịch sử giao dịch (Transactions):**
  - Xem danh sách giao dịch cả "Mua" và "Bán".
  - Hiển thị tóm tắt, trạng thái giao dịch (Hoàn thành, Đang xử lý, v.v...).
  - Cập nhật số liệu thống kê (Stats grid).

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
2. Copy và chạy toàn bộ mã SQL trong file `backend/supabase_migration.sql` để tạo bảng `profiles`, `transactions`, và các RLS Policies.
3. Vào phần **Storage** tạo một bucket mới tên là `avatar` và đặt nó ở chế độ **Public**.

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

## 📜 Cấu trúc Source Code chính

- `frontend/src/pages/auth`: Quản lý các trang liên quan đăng ký, đăng nhập, quên mật khẩu.
- `frontend/src/pages/client`: Quản lý trang người dùng khi đã vào app: `ClientHomePage`, `ProfilePage`, `TransactionHistoryPage`.
- `backend/src/controllers`: Trung tâm xử lý API cho `Auth`, `Profile` và `Transactions`.
- `backend/src/services`: Xử lý tương tác logic phức tạp, kết nối Supabase Admin Client và cấu hình NodeMailer gửi mail.

---
*Developed with modern web tooling to ensure the best UI/UX and stability.*
