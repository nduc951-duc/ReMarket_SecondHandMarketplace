# ReMarket - Second-hand Marketplace

## Client Route Checklist (For Testing)

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
