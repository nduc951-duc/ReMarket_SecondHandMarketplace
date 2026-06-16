# ReMarket - Second-hand Marketplace

ReMarket is a fullstack second-hand marketplace where users can buy, sell, chat, manage transactions, receive notifications, review other users, and handle payment flows. The project was built as a personal portfolio project for Fullstack / Backend internship applications.

## Highlights

- Email authentication with Supabase Auth
- Role-based access for customer, agent, and admin users
- Product listing, search, filtering, autocomplete, create, update, and delete
- Seller dashboard and personal product management
- Wishlist and product detail pages
- Buyer-seller transaction flow
- MoMo and VNPAY payment strategy structure
- Realtime-style chat and notification modules
- User profile, avatar upload, and review system
- Admin dashboard for users, products, transactions, and moderation
- Clean frontend route guards for protected pages

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React, Vite, React Router, Zustand, Tailwind CSS, Radix UI, Lucide React |
| Backend | Node.js, Express, Multer, Nodemailer |
| Database/Auth/Storage | Supabase |
| Payment | MoMo sandbox, VNPAY sandbox strategy modules |
| Tooling | ESLint, Prettier |

## Project Structure

```text
.
+-- Second-handMarketplace/
|   +-- backend/
|   |   +-- scripts/                  # Seed scripts
|   |   +-- src/
|   |   |   +-- controllers/           # HTTP request handlers
|   |   |   +-- middlewares/           # Auth and admin guards
|   |   |   +-- routes/                # Express routes
|   |   |   +-- services/              # Business logic and Supabase access
|   |   |   +-- strategies/            # Payment strategy implementations
|   |   |   +-- app.js                 # Express app setup
|   |   +-- supabase_migration_fixed.sql
|   |   +-- supabase_seed_marketplace_products.sql
|   +-- frontend/
|   |   +-- src/
|   |   |   +-- components/            # Shared UI components
|   |   |   +-- hooks/                 # Custom React hooks
|   |   |   +-- pages/                 # Auth, client, admin, agent, system pages
|   |   |   +-- services/              # API/Supabase client calls
|   |   |   +-- store/                 # Zustand auth store
|   |   |   +-- utils/                 # Validation and access helpers
|   |   +-- vite.config.js
+-- README.md
```

## Main Features

### Authentication and Roles

- Register with email verification
- Login with Supabase Auth
- Forgot password and reset password flow
- Change password for authenticated users
- Protected routes for logged-in users
- Admin and agent route guards

### Marketplace

- Browse products
- Search and autocomplete
- Filter by category, condition, price, and location
- View product details
- Create, edit, and delete personal product listings
- Seller dashboard
- Wishlist toggle and wishlist status

### Transactions and Payments

- Create transactions from product flows
- Track transaction status
- View transaction history and stats
- Payment creation, return, IPN, query, and refund endpoints
- Strategy-based payment structure for MoMo and VNPAY

### AI Support Chat

- Floating AI support widget available across the frontend
- Retrieval-Augmented Generation (RAG) flow over internal FAQ and policy content
- Answers general marketplace, payment, refund, account, and safety questions
- Does not read personal user data or private order history
- Works in retrieval fallback mode without an API key
- Uses OpenAI Responses API when `OPENAI_API_KEY` is configured on the backend

### Chat, Notifications, Reviews

- Buyer-seller conversations
- Send and fetch messages
- Mark conversations as read
- Notification list and unread count
- User reviews by transaction

### Admin and Agent

- Overview dashboard
- Manage users
- Manage products
- View transactions
- Agent inbox/support flow

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project
- Gmail App Password if you want email verification/reset emails to work
- MoMo/VNPAY sandbox credentials if you want to test payment gateways

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd <repository-folder>/Second-handMarketplace
```

### 2. Configure Supabase

Run the SQL migrations in your Supabase SQL editor:

```text
Second-handMarketplace/backend/supabase_migration_fixed.sql
Second-handMarketplace/backend/supabase_add_product_image_url.sql
Second-handMarketplace/backend/supabase_payment_lifecycle.sql
Second-handMarketplace/backend/supabase_fts_migration.sql
```

Optional seed data:

```text
Second-handMarketplace/backend/supabase_seed_marketplace_products.sql
```

### 3. Configure backend environment

Create `Second-handMarketplace/backend/.env` from `Second-handMarketplace/backend/.env.example`.

Required values:

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

PAYMENT_RETURN_URL=http://localhost:5173/payment/return
PAYMENT_NOTIFY_URL=http://localhost:4000/api/payment/ipn/momo

# Optional AI support chat
AI_PROVIDER=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-nano
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
```

### 4. Configure frontend environment

Create `Second-handMarketplace/frontend/.env` from `Second-handMarketplace/frontend/.env.example`.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_BACKEND_URL=http://localhost:4000
```

### 5. Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd ../frontend
npm install
```

### 6. Run the app locally

Start backend:

```bash
cd backend
npm run dev
```

Start frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend health check:

```text
http://localhost:4000/api/health
```

## Seed Test Accounts

After configuring `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, seed demo users:

```bash
cd backend
npm run seed:users
```

Default seeded accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@test.com | Admin@123 |
| Agent | agent@test.com | Agent@123 |
| Seller | seller@test.com | Seller@123 |
| Buyer | buyer@test.com | Buyer@123 |
| Buyer + Seller | both@test.com | Both@123 |

## API Overview

Protected endpoints require:

```http
Authorization: Bearer <supabase_access_token>
```

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Request signup verification |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/resend-verification` | Resend verification email |
| POST | `/api/auth/change-password` | Change current user's password |

### Products

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/products` | List/search products |
| GET | `/api/products/autocomplete` | Product autocomplete |
| GET | `/api/products/:id` | Product detail |
| GET | `/api/products/seller/:sellerId` | Products by seller |
| GET | `/api/products/user/my` | Current user's products |
| POST | `/api/products` | Create product |
| PATCH | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Profile, Transactions, Chat

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/profile` | Get current profile |
| PUT | `/api/profile` | Update profile |
| POST | `/api/profile/avatar` | Upload avatar |
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions` | Create transaction |
| PATCH | `/api/transactions/:id/status` | Update transaction status |
| GET | `/api/chat/conversations` | List conversations |
| POST | `/api/chat/messages` | Send message |

### Admin, Notifications, Wishlist, Reviews, Payments

| Area | Base Endpoint |
| --- | --- |
| Admin | `/api/admin` |
| Notifications | `/api/notifications` |
| Wishlist | `/api/wishlist` |
| Reviews | `/api/reviews` |
| Upload | `/api/upload` |
| Payment | `/api/payment` |
| Categories | `/api/categories` |
| AI Support | `/api/ai-support` |

## Available Scripts

Backend:

```bash
npm run dev
npm start
npm test
npm run seed:users
npm run lint
npm run format
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
npm test
npm run lint
npm run format
```

## Portfolio Notes

This project is suitable for showing:

- Backend API design with Express route/controller/service layers
- Supabase Auth integration and role-based authorization
- Real product, transaction, chat, notification, review, and payment flows
- React protected routing and client-side state management
- Practical fullstack environment setup

Recommended next improvements:

- Add automated tests for backend services and API routes
- Add Swagger/OpenAPI documentation
- Add CI workflow for lint/build
- Deploy frontend and backend, then add live demo links here
- Add screenshots or a short demo video to this README

## Security Notes

- Do not commit real `.env` files.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only on the backend.
- Use Gmail App Passwords instead of your normal Gmail password.
- Use sandbox credentials for payment testing.

## Author

Built by nduc951-duc as a personal fullstack marketplace project.
