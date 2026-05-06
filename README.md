# ♻️ ReMarket - Nền tảng Thương mại Điện tử Đồ cũ (Second-hand Marketplace)

ReMarket là một nền tảng thương mại điện tử chuyên biệt dành cho việc mua bán đồ cũ (Second-hand), được thiết kế với giao diện hiện đại (Glassmorphism), trực quan và dễ sử dụng. Dự án được chia thành hai phần Backend và Frontend rõ ràng, giao tiếp thông qua RESTful APIs và bảo mật nghiêm ngặt bằng JWT token kết hợp hệ thống Supabase mạnh mẽ.

---

## 🚀 Công nghệ sử dụng

### Frontend
- **Framework:** React.js (với Vite để build tốc độ cao).
- **Routing:** React Router DOM.
- **State Management:** Zustand (quản lý state toàn cục nhẹ nhàng, tối ưu).
- **Styling:** CSS thuần tuân thủ theo nguyên lý Glassmorphism & UI/UX hiện đại (không dùng UI library, tối đa hóa khả năng tùy biến).
- **Real-time:** Supabase Realtime (WebSockets) cho hệ thống Chat và Notifications.

### Backend
- **Core:** Node.js, Express.js.
- **Architecture:** Mô hình MVC (Controller-Service-Route), code base cấu trúc rõ ràng, dễ bảo trì và mở rộng.
- **Mailing:** Nodemailer (tích hợp Gmail SMTP để gửi mã xác thực, thông báo đặt lại mật khẩu an toàn).

### Database & Cloud (Supabase)
- **Database:** PostgreSQL mạnh mẽ.
- **Authentication:** Supabase Auth (đăng nhập Email/Password, tích hợp Google OAuth).
- **Storage:** Supabase Storage Bucket để lưu trữ hình ảnh (Avatars, thư viện ảnh Sản phẩm).
- **Security:** RLS (Row Level Security) Policies bảo vệ dữ liệu ở cấp độ database, ngăn chặn truy cập trái phép.

---

## ✨ Các tính năng nổi bật (Features)

ReMarket cung cấp một luồng (flow) hoàn chỉnh cho cả Người Mua và Người Bán, từ lúc đăng nhập, khám phá sản phẩm, trao đổi tin nhắn, cho đến khi hoàn tất giao dịch.

### 1. 🔐 Quản lý Tài khoản & Xác thực (Authentication)
- **Đăng ký / Đăng nhập:** Hỗ trợ đăng nhập linh hoạt qua Email/Mật khẩu hoặc **Google OAuth**.
- **Xác thực Email:** Tự động gửi email xác nhận khi đăng ký mới.
- **Bảo mật:** Quên mật khẩu qua email link bảo mật, thay đổi mật khẩu ngay trong ứng dụng.
- **Hồ sơ Cá nhân (Profile):** Cập nhật thông tin cá nhân, thay đổi ảnh đại diện (Avatar upload trực tiếp lên Supabase Storage).

### 2. 🛍️ Khám phá & Tìm kiếm Sản phẩm (Discovery)
- **Trang chủ động (Dynamic Home Page):** Hiển thị danh sách sản phẩm nổi bật với hiệu ứng **Skeleton Loading** mượt mà trong lúc tải dữ liệu. Hỗ trợ phân trang (Pagination).
- **Tìm kiếm thông minh & Bộ lọc đa dạng:** Tìm kiếm theo từ khóa, lọc theo Danh mục, Tình trạng (Mới, Cũ, ...), Khoảng giá, và sắp xếp theo nhiều tiêu chí (mới nhất, giá tăng/giảm).
- **Chi tiết Sản phẩm:** Xem thông tin kỹ thuật, thư viện ảnh (Image Gallery), thông tin uy tín của người bán, và các gợi ý sản phẩm liên quan.

### 3. 💬 Tương tác & Real-time Chat
- **Nhắn tin Trực tiếp (Real-time Messaging):** Người mua và Người bán có thể trao đổi trực tiếp với nhau về sản phẩm thông qua giao diện Chat hiện đại.
- **Optimistic UI:** Tin nhắn hiển thị ngay lập tức (instant feedback) trước khi được xác nhận bởi server, mang lại trải nghiệm mượt mà không độ trễ.
- **Đồng bộ Supabase Realtime:** Đảm bảo hệ thống tin nhắn được cập nhật tức thời trên nhiều thiết bị.

### 4. 🔔 Thông báo & Danh sách yêu thích (Notifications & Wishlist)
- **Thông báo Real-time (Push Notifications):** Cập nhật ngay lập tức các sự kiện quan trọng (có tin nhắn mới, đơn hàng thay đổi trạng thái, ...) thông qua Supabase Postgres Changes.
- **Wishlist (Sản phẩm yêu thích):** Lưu trữ các sản phẩm bạn quan tâm để xem lại sau. Quản lý danh sách một cách tiện lợi.

### 5. 🛒 Giao dịch & Quản lý Đơn hàng (Transactions)
- **Đặt hàng nhanh chóng:** Người mua dễ dàng thực hiện lệnh "Đặt mua" với thao tác đơn giản và minh bạch.
- **Lịch sử Giao dịch (Timeline):** Người mua có thể theo dõi hành trình đơn hàng qua các trạng thái chuẩn xác: *Chờ xác nhận -> Đã giao -> Hoàn thành*. Hỗ trợ nút "Xác nhận nhận hàng".
- **Dashboard Người Bán (Seller Dashboard):** Giao diện quản lý chuyên biệt với các thẻ thống kê KPI (số đơn chờ, doanh thu). Cho phép **Xác nhận giao hàng** hoặc **Từ chối đơn hàng** (yêu cầu kèm lý do từ chối để đảm bảo minh bạch).

### 6. 📦 Quản lý Cửa hàng Của Tôi (Seller Features)
- **Kho Sản phẩm (My Products):** Quản lý toàn bộ danh sách sản phẩm đang đăng bán. Lọc nhanh theo trạng thái.
- **Tạo/Sửa Sản phẩm:** Đăng sản phẩm mới, upload nhiều ảnh cùng lúc với tính năng xem trước (preview) và xóa ảnh linh hoạt.
- **Bật/Tắt Trạng thái:** Hỗ trợ tính năng "Ẩn nhanh" sản phẩm khỏi cửa hàng (ví dụ: khi hết hàng hoặc muốn ngưng bán tạm thời) và kích hoạt lại dễ dàng.

---

## 🗺️ Sơ đồ Luồng ứng dụng (Client Routes)

Base URL mặc định: `http://localhost:5173` (hoặc `5174` nếu port bị trùng).

| Path | Component/Page | Quyền truy cập | Mô tả |
|---|---|---|---|
| `/` | `RootRedirect` | Public | Tự động điều hướng đến `/app` (nếu đã login) hoặc `/login`. |
| `/login` | `LoginPage` | Auth-only | Đăng nhập hệ thống. |
| `/register` | `RegisterPage` | Auth-only | Đăng ký tài khoản mới. |
| `/forgot-password` | `ForgotPasswordPage`| Auth-only | Yêu cầu khôi phục mật khẩu qua Email. |
| `/reset-password` | `ResetPasswordPage` | Public | Form đặt lại mật khẩu (truy cập từ link email). |
| `/app` | `ClientHomePage` | Protected | Trang chủ chính (Hiển thị Lưới sản phẩm). |
| `/profile` | `ProfilePage` | Protected | Quản lý thông tin cá nhân & Avatar. |
| `/change-password` | `ChangePasswordPage`| Protected | Đổi mật khẩu. |
| `/transactions` | `TransactionHistory` | Protected | Lịch sử mua/bán & Timeline theo dõi đơn hàng. |
| `/wishlist` | `WishlistPage` | Protected | Danh sách sản phẩm yêu thích (Wishlist). |
| `/notifications` | `NotificationsPage` | Protected | Trung tâm thông báo (Real-time). |
| `/chat` | `ChatPage` | Protected | Giao diện nhắn tin Real-time giữa Mua/Bán. |
| `/products/:id` | `ProductDetailPage` | Public | Xem chi tiết sản phẩm. |
| `/products/new` | `ProductFormPage` | Protected | Form đăng bán sản phẩm mới. |
| `/products/:id/edit`| `ProductFormPage` | Protected | Form chỉnh sửa thông tin sản phẩm. |
| `/seller/dashboard`| `SellerDashboard` | Protected | Quản lý đơn hàng (Dành cho Người Bán). |
| `/my-products` | `MyProductsPage` | Protected | Quản lý kho hàng (Dành cho Người Bán). |
| `*` | `Fallback` | Public | Redirect tự động về `/`. |

*(**Lưu ý:** Các Route thuộc nhóm `Protected` yêu cầu phải có phiên đăng nhập (session) hợp lệ. Nếu chưa đăng nhập, hệ thống sẽ tự động chuyển hướng người dùng về trang `/login`.)*

---

## 🛠 Cài đặt và Khởi chạy môi trường Development

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18+ (khuyên dùng LTS).
- **Supabase**: Một project Supabase để lưu trữ Database & Auth.
- **Gmail**: Một tài khoản Gmail dùng để cấu hình SMTP (cần bật tính năng App Password).

### 2. Cài đặt thư viện (Dependencies)
Đảm bảo bạn cài đặt packages cho cả Frontend và Backend:

```bash
# Cài đặt cho Backend
cd Second-handMarketplace/backend
npm install

# Cài đặt cho Frontend
cd ../frontend
npm install
```

### 3. Cấu hình Biến môi trường (.env)

**A. Tại thư mục `backend`:**
Tạo file `backend/.env` bằng cách copy từ file `backend/.env.example` và điều chỉnh:
```env
# Supabase Client
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>

# Server Config
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173

# Gmail SMTP 
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Supabase Auth Admin Level (Lấy ở mục API settings của Supabase)
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# App Configs
MAIL_FROM_NAME=ReMarket
SIGNUP_CONFIRM_PATH=/login
RESET_PASSWORD_PATH=/reset-password
SIGNUP_COOLDOWN_SECONDS=90
```

**B. Tại thư mục `frontend`:**
Tạo file `frontend/.env`:
```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_BACKEND_URL=http://localhost:4000
```

### 4. Thiết lập Database & Supabase

1. Truy cập vào [Supabase Dashboard](https://supabase.com/dashboard) và tạo một Project.
2. Mở công cụ **SQL Editor**.
3. Copy toàn bộ mã SQL từ file `backend/supabase_migration.sql` (hoặc các file script mới nhất) và chạy (Run) để khởi tạo toàn bộ cấu trúc CSDL (Bảng) cùng các quy tắc bảo mật **RLS Policies**.
4. Chuyển sang mục **Storage**:
   - Tạo một bucket mới với tên là `avatar` và đặt ở chế độ **Public** (để lưu ảnh đại diện).
   - Đảm bảo có thiết lập các bucket khác (ví dụ: `products` để upload ảnh sản phẩm) theo yêu cầu.
5. *(Tùy chọn)* Chạy script **DB Seed** nếu có sẵn để chèn dữ liệu mẫu (categories, products, users) phục vụ cho quá trình dev.

### 5. Khởi chạy dự án

Mở 2 cửa sổ Terminal (hoặc tab) để chạy đồng thời cả Backend và Frontend:

```bash
# Terminal 1 - Backend Server (Chạy ở Port 4000)
cd Second-handMarketplace/backend
npm run dev

# Terminal 2 - Frontend Development Server (Chạy ở Port 5173)
cd Second-handMarketplace/frontend
npm run dev
```

Sau khi Terminal báo thành công, mở trình duyệt và truy cập: [http://localhost:5173](http://localhost:5173). 🚀

---
*Built with ❤️ for a sustainable second-hand economy.*
