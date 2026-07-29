# Graph Report - Second-handMarketplace  (2026-07-29)

## Corpus Check
- 237 files · ~94,245 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1559 nodes · 2838 edges · 99 communities (90 shown, 9 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 184 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `52b05ed7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- backend/src/services/transactionService.js
- authController.js
- ClientHomePage.jsx
- authService.js
- devDependencies
- authMiddleware.js
- productModel.js
- adminController.js
- backend/src/services/chatService.js
- backend/src/services/aiSupportService.js
- AdminDashboardPage.jsx
- backend/src/services/notificationService.js
- App.jsx
- ChatPage.jsx
- backend/src/services/reviewService.js
- NotificationsPage.jsx
- supabaseClient.js
- app.js
- ProductDetailPage.jsx
- TransactionHistoryPage.jsx
- components.json
- dependencies
- MomoStrategy.js
- PaymentContext.js
- dependencies
- VnpayStrategy.js
- signature.js
- signature.js
- categoryRoutes.js
- uploadService.js
- ProfilePage.jsx
- WishlistPage.jsx
- seedUsers.js
- scripts
- frontend/package.json
- AiSupportWidget.jsx
- backend/.prettierrc.json
- uploadRoutes.js
- frontend/.prettierrc.json
- check_buckets.js
- paymentController.js
- compilerOptions
- react-helmet-async
- react-router-dom
- zustand
- vercel.json
- postcss.config.js
- tailwind.config.js
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- transactionRoutes.js
- extraction-spec.md
- tailwind-merge
- note.md
- Payment Lifecycle
- Chat and realtime flow
- Realtime Chat
- ReMarket architecture
- Supabase Project
- Project map
- Verify ReMarket
- class-variance-authority
- PaymentContext.js
- paymentRoutes.js
- categoryRoutes.js
- paymentWebhookFlows.test.js
- transactionFlows.test.js
- paymentExpiryWorker.js
- authorizationFlows.test.js
- AiSupportWidget.jsx
- ReMarket RLS policies
- errorHandling.test.js
- inMemorySupabase.js
- errorResponseMiddleware.js
- requestContextMiddleware.js
- server.js
- clsx
- MyProductsPage.jsx
- ChatPage.jsx
- frontend/src/services/reviewService.js
- paymentRoutes.js
- databaseHardening.test.js
- realtimeChat.test.js
- realtime.js
- class-variance-authority
- WishlistPage.jsx
- frontend/src/services/reviewService.js
- clsx
- tailwind-merge
- frontend/src/services/reviewService.js
- server.js
- realtime.js
- form-field.tsx
- vite-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 55 edges
2. `useAuthStore` - 33 edges
3. `Query` - 20 edges
4. `compilerOptions` - 20 edges
5. `ChatPage()` - 17 edges
6. `ProductDetailPage()` - 16 edges
7. `buildServiceError()` - 14 edges
8. `createNotification()` - 14 edges
9. `loadWithMocks()` - 14 edges
10. `AdminDashboardPage()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `AdminDashboardPage()` --indirect_call--> `status()`  [INFERRED]
  frontend/src/pages/admin/AdminDashboardPage.jsx → backend/tests/errorHandling.test.js
- `ProductDetailPage()` --indirect_call--> `status()`  [INFERRED]
  frontend/src/pages/client/ProductDetailPage.jsx → backend/tests/errorHandling.test.js
- `TransactionHistoryPage()` --indirect_call--> `status()`  [INFERRED]
  frontend/src/pages/client/TransactionHistoryPage.jsx → backend/tests/errorHandling.test.js
- `SellerDashboard()` --indirect_call--> `transaction()`  [INFERRED]
  frontend/src/pages/client/SellerDashboard.jsx → backend/tests/transactionFlows.test.js
- `TransactionHistoryPage()` --indirect_call--> `transaction()`  [INFERRED]
  frontend/src/pages/client/TransactionHistoryPage.jsx → backend/tests/transactionFlows.test.js

## Import Cycles
- None detected.

## Communities (99 total, 9 thin omitted)

### Community 0 - "backend/src/services/transactionService.js"
Cohesion: 0.16
Nodes (21): createPaymentHandler(), {
  expireUnpaidTransactions,
  markTransactionPaymentCreated,
  prepareTransactionPayment,
}, getClientIp(), getIpnResponse(), { getPayment, updatePaymentFromGateway, upsertPayment }, getRequestBaseUrl(), handleVerifiedResult(), normalizePaymentPayload() (+13 more)

### Community 1 - "authController.js"
Cohesion: 0.06
Nodes (55): dotenv, buildForgotPasswordHtml(), buildResendVerificationHtml(), buildSignupHtml(), canRequestNow(), changePasswordHandler(), {
  changeUserPassword,
  generateRecoveryLink,
  generateSignupLink,
  resendVerificationEmail,
}, {
  FORGOT_PASSWORD_COOLDOWN_SECONDS,
  MAIL_FROM_NAME,
  SIGNUP_COOLDOWN_SECONDS,
} (+47 more)

### Community 2 - "ClientHomePage.jsx"
Cohesion: 0.11
Nodes (24): CategoryCard(), getProductImage(), ProductCard(), ProductSection(), SearchBar(), SearchFilterSidebar(), iconMap, SidebarCategory() (+16 more)

### Community 3 - "authService.js"
Cohesion: 0.12
Nodes (35): AuthLayout(), PasswordInput(), ChangePasswordPage(), defaultForm, defaultForm, ForgotPasswordPage(), defaultForm, LoginPage() (+27 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (48): author, dependencies, cors, dotenv, express, express-rate-limit, helmet, multer (+40 more)

### Community 5 - "authMiddleware.js"
Cohesion: 0.08
Nodes (37): { uploadImage }, uploadImagesHandler(), { getWishlist, getWishlistStatus, toggleWishlist }, getWishlistHandler(), getWishlistStatusHandler(), sendError(), toggleWishlistHandler(), attachUserIfPresent() (+29 more)

### Community 6 - "productModel.js"
Cohesion: 0.07
Nodes (56): ALLOWED_CONDITIONS, ALLOWED_PRODUCT_STATUSES, autocompleteProductsHandler(), {
  createProduct,
  getPublicProductById,
  getPublicProducts,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
  getPublicProductsBySeller,
  hasOpenTransactionsForProduct,
  incrementProductViewCount,
  autocompleteProducts,
}, createProductHandler(), deleteProductHandler(), getMyProductsHandler(), getProductByIdHandler() (+48 more)

### Community 7 - "adminController.js"
Cohesion: 0.06
Nodes (61): createUserHandler(), {
  getAdminOverview,
  getAdminUsers,
  getAdminProducts,
  updateProductStatusByAdmin,
  getAdminTransactions,
  updateUserRole,
  updateUserStatus,
  createUser,
}, getAdminOverviewHandler(), getAdminProductsHandler(), getAdminTransactionsHandler(), getAdminUsersHandler(), sendError(), updateProductStatusByAdminHandler() (+53 more)

### Community 8 - "backend/src/services/chatService.js"
Cohesion: 0.08
Nodes (59): ensureConversationHandler(), {
  getConversations,
  getMessages,
  sendMessage,
  ensureConversation,
  markConversationRead,
  getUnreadConversationCount,
}, getConversationsHandler(), getMessagesHandler(), getUnreadConversationCountHandler(), markConversationReadHandler(), sendError(), sendMessageHandler() (+51 more)

### Community 9 - "backend/src/services/aiSupportService.js"
Cohesion: 0.13
Nodes (26): { answerAiSupportQuestion }, askAiSupportHandler(), sendError(), aiKnowledgeBase, { askAiSupportHandler }, express, router, aiKnowledgeBase (+18 more)

### Community 10 - "AdminDashboardPage.jsx"
Cohesion: 0.15
Nodes (22): AdminDashboardPage(), formatCurrency(), formatDate(), getCount(), PRODUCT_STATUS_LABELS, PRODUCT_STATUS_OPTIONS, ROLE_OPTIONS, TABS (+14 more)

### Community 11 - "backend/src/services/notificationService.js"
Cohesion: 0.16
Nodes (23): {
  createReview,
  getReviewsByUser,
  getReviewForTransaction,
  getMyReviews,
}, createReviewHandler(), getMyReviewsHandler(), getReviewForTransactionHandler(), getReviewsByUserHandler(), sendError(), { createReview }, {
  createReviewHandler,
  getReviewsByUserHandler,
  getReviewForTransactionHandler,
  getMyReviewsHandler,
} (+15 more)

### Community 12 - "App.jsx"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 14 - "backend/src/services/reviewService.js"
Cohesion: 0.05
Nodes (41): eslint-plugin-react, eslint-plugin-react-hooks, devDependencies, eslint, eslint-config-prettier, eslint-plugin-react, eslint-plugin-react-hooks, jsdom (+33 more)

### Community 15 - "NotificationsPage.jsx"
Cohesion: 0.18
Nodes (16): {
  createTransaction,
  getTransactionById,
  getTransactions,
  getTransactionStats,
  updateTransactionStatus,
}, createTransactionHandler(), { getProductById }, getTransactionByIdHandler(), getTransactionsHandler(), getTransactionStatsHandler(), sendError(), updateTransactionStatusHandler() (+8 more)

### Community 16 - "supabaseClient.js"
Cohesion: 0.14
Nodes (13): createObservabilityMiddleware(), logger, isSensitiveKey(), redact(), SENSITIVE_KEYS, write(), app, assert (+5 more)

### Community 17 - "app.js"
Cohesion: 0.21
Nodes (19): useRealtimeBadges(), FILTERS, formatCurrency(), formatDate(), getActionLabel(), getFilterValue(), getNotificationCopy(), getNotificationKind() (+11 more)

### Community 18 - "ProductDetailPage.jsx"
Cohesion: 0.18
Nodes (16): { getProfile, updateProfile, uploadAvatar }, getProfileHandler(), updateProfileHandler(), uploadAvatarHandler(), express, {
  getProfileHandler,
  updateProfileHandler,
  uploadAvatarHandler,
}, multer, { requireAuth } (+8 more)

### Community 19 - "TransactionHistoryPage.jsx"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 20 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 21 - "dependencies"
Cohesion: 0.04
Nodes (47): @base-ui/react, class-variance-authority, clsx, @fontsource-variable/geist, author, dependencies, @base-ui/react, class-variance-authority (+39 more)

### Community 22 - "MomoStrategy.js"
Cohesion: 0.25
Nodes (6): { createHmacSignature, verifyHmacSignature }, createRequestId(), MomoStrategy, PaymentStrategy, requireConfig(), createHmacSignature()

### Community 23 - "PaymentContext.js"
Cohesion: 0.27
Nodes (17): ChatPage(), formatConversationTime(), formatCurrency(), formatTime(), getInitials(), getPeer(), getPeerName(), getPreview() (+9 more)

### Community 24 - "dependencies"
Cohesion: 0.29
Nodes (6): Database hardening, Moderation reports, Payment callback idempotency, Realtime chat, Supabase schema invariants, Transactions

### Community 25 - "VnpayStrategy.js"
Cohesion: 0.21
Nodes (7): {
  buildVnpayHashData,
  buildVnpayQuery,
  createHmacSignature,
  sortObject,
  verifyHmacSignature,
}, formatVnpayDate(), getClientIp(), pad(), PaymentStrategy, requireConfig(), VnpayStrategy

### Community 26 - "signature.js"
Cohesion: 0.48
Nodes (5): AiSupportWidget(), createMessage(), initialMessages, askAiSupport(), getBackendUrl()

### Community 27 - "signature.js"
Cohesion: 0.26
Nodes (12): buildRawSignatureString(), buildVnpayHashData(), buildVnpayQuery(), crypto, encodeVnpayValue(), sortObject(), timingSafeEqual(), verifyHmacSignature() (+4 more)

### Community 28 - "categoryRoutes.js"
Cohesion: 0.07
Nodes (27): adminRoutes, aiSupportRoutes, { apiRateLimiter }, app, authRoutes, categoryRoutes, chatRoutes, cors (+19 more)

### Community 29 - "uploadService.js"
Cohesion: 0.33
Nodes (5): Backend boundaries, Finish, Frontend boundaries, ReMarket Conventions, Work from the existing design

### Community 30 - "ProfilePage.jsx"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "WishlistPage.jsx"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 32 - "seedUsers.js"
Cohesion: 0.19
Nodes (14): buildSeedUsers(), { createClient }, ensureUser(), findUserByEmail(), run(), seedSellerProducts(), sellerProducts, upsertProfile() (+6 more)

### Community 33 - "scripts"
Cohesion: 0.07
Nodes (29): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, checkJs, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules (+21 more)

### Community 34 - "frontend/package.json"
Cohesion: 0.15
Nodes (17): Avatar(), AvatarProps, Card(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle() (+9 more)

### Community 36 - "backend/.prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, semi, singleQuote, tabWidth, trailingComma

### Community 37 - "uploadRoutes.js"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 38 - "frontend/.prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, semi, singleQuote, tabWidth, trailingComma

### Community 39 - "check_buckets.js"
Cohesion: 0.40
Nodes (3): { createClient }, path, supabase

### Community 40 - "paymentController.js"
Cohesion: 0.16
Nodes (13): { FRONTEND_ORIGIN }, { checkReadiness }, healthHandler(), readinessHandler(), express, { healthHandler, readinessHandler }, router, checkReadiness() (+5 more)

### Community 41 - "compilerOptions"
Cohesion: 0.40
Nodes (4): compilerOptions, baseUrl, ignoreDeprecations, paths

### Community 42 - "react-helmet-async"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 43 - "react-router-dom"
Cohesion: 0.33
Nodes (5): Backend, Frontend, Knowledge graph, Notes, Verification commands

### Community 44 - "zustand"
Cohesion: 0.50
Nodes (3): graphify, ReMarket project skills, Supabase

### Community 46 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, outputDirectory, rewrites, $schema

### Community 49 - "postcss.config.js"
Cohesion: 0.20
Nodes (22): buildServiceError(), { createClient }, { createNotification }, createTransaction(), enrichTransactionsWithProfilesAndReviews(), ensureProfileForUser(), expireUnpaidTransactions(), getAdminClient() (+14 more)

### Community 50 - "tailwind.config.js"
Cohesion: 0.11
Nodes (18): ApiErrorPayload, Category, Conversation, Json, Message, Notification, PaginatedResult, PaymentMethod (+10 more)

### Community 54 - "transactionRoutes.js"
Cohesion: 0.24
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 56 - "tailwind-merge"
Cohesion: 0.40
Nodes (4): Important files, Payment status, Transaction and payment states, Transaction status

### Community 58 - "Payment Lifecycle"
Cohesion: 0.40
Nodes (4): Payment Lifecycle, Preserve invariants, Trace the complete flow, Verify

### Community 59 - "Chat and realtime flow"
Cohesion: 0.40
Nodes (4): Backend, Chat and realtime flow, Frontend, SQL

### Community 60 - "Realtime Chat"
Cohesion: 0.40
Nodes (4): Preserve boundaries, Realtime behavior, Realtime Chat, Verify

### Community 61 - "ReMarket architecture"
Cohesion: 0.40
Nodes (4): Backend, Cross-cutting rules, Frontend, ReMarket architecture

### Community 62 - "Supabase Project"
Cohesion: 0.40
Nodes (4): Gather context, Make changes, Supabase Project, Verify

### Community 63 - "Project map"
Cohesion: 0.50
Nodes (3): Project map, Reference files, Sources of truth

### Community 64 - "Verify ReMarket"
Cohesion: 0.50
Nodes (3): Execute, Select checks, Verify ReMarket

### Community 65 - "class-variance-authority"
Cohesion: 0.14
Nodes (14): assert, { createResponse }, { loadWithMocks }, test, assert, { loadWithMocks }, test, createResponse() (+6 more)

### Community 66 - "PaymentContext.js"
Cohesion: 0.15
Nodes (5): MomoStrategy, paymentConfig, PaymentContext, strategyFactories, VnpayStrategy

### Community 67 - "paymentRoutes.js"
Cohesion: 0.33
Nodes (5): assert, migration, path, { readFileSync }, test

### Community 68 - "categoryRoutes.js"
Cohesion: 0.23
Nodes (9): { getCategories }, getCategoriesHandler(), express, { getCategoriesHandler }, router, { createClient }, getAdminClient(), getCategories() (+1 more)

### Community 69 - "paymentWebhookFlows.test.js"
Cohesion: 0.17
Nodes (15): { ADMIN_EMAILS, AGENT_EMAILS }, isAdminUser(), isAgentUser(), parseAdminEmails(), parseAgentEmails(), requireAdmin(), requireAdminOrAgent(), assert (+7 more)

### Community 70 - "transactionFlows.test.js"
Cohesion: 0.18
Nodes (9): assert, createFixture(), { createInMemorySupabase }, envModulePath, { loadWithMocks }, notificationServicePath, supabaseModulePath, test (+1 more)

### Community 71 - "paymentExpiryWorker.js"
Cohesion: 0.23
Nodes (8): createPaymentExpiryWorker(), { expireUnpaidTransactions }, startStandaloneWorker(), { createPaymentExpiryWorker }, runPaymentExpiryOnce(), assert, {
  DEFAULT_INTERVAL_MS,
  createPaymentExpiryWorker,
}, test

### Community 72 - "authorizationFlows.test.js"
Cohesion: 0.09
Nodes (38): ModerationPage(), STATUS_LABELS, CONDITION_LABELS, getProductImages(), PAYMENT_METHODS, ProductDetailPage(), readProductCache(), writeProductCache() (+30 more)

### Community 73 - "AiSupportWidget.jsx"
Cohesion: 0.29
Nodes (8): readStoredTheme(), Theme, ThemeContext, ThemeContextValue, ThemeProvider(), useTheme(), ThemeToggle(), ThemeHarness()

### Community 74 - "ReMarket RLS policies"
Cohesion: 0.50
Nodes (3): Browser/backend access boundary, Realtime chat, ReMarket RLS policies

### Community 75 - "errorHandling.test.js"
Cohesion: 0.18
Nodes (9): AppError, errorHandler(), normalizeError(), notFoundHandler(), app, assert, { errorHandler }, status() (+1 more)

### Community 76 - "inMemorySupabase.js"
Cohesion: 0.17
Nodes (8): bearerSecurity, errorResponse, openapiDocument, optionalBearerSecurity, express, openapiDocument, router, swaggerUi

### Community 77 - "errorResponseMiddleware.js"
Cohesion: 0.67
Nodes (3): createErrorResponseMiddleware(), normalizeErrorPayload(), STATUS_CODES

### Community 79 - "server.js"
Cohesion: 0.29
Nodes (6): 1. Create the Supabase demo project, 2. Deploy the backend on Render, 3. Deploy the frontend on Vercel, 4. Publish the portfolio assets, Release checklist, ReMarket deployment runbook

### Community 80 - "clsx"
Cohesion: 0.15
Nodes (4): PaymentStrategy, assert, PaymentStrategy, test

### Community 81 - "MyProductsPage.jsx"
Cohesion: 0.18
Nodes (17): isSupabaseConfigured, clearMyProductsCache(), getCacheKey(), getProductImage(), MyProductsPage(), readCache(), statusLabels, writeCache() (+9 more)

### Community 82 - "ChatPage.jsx"
Cohesion: 0.13
Nodes (19): transaction(), SellerDashboard(), statusLabels, formatCurrency(), formatDate(), PAYMENT_STATUS_LABELS, PAYMENT_STATUS_STYLES, STATUS_LABELS (+11 more)

### Community 83 - "frontend/src/services/reviewService.js"
Cohesion: 0.20
Nodes (8): ToastContext, ToastContextValue, ToastInput, ToastProvider(), ToastRecord, ToastTone, toneStyles, rootElement

### Community 84 - "paymentRoutes.js"
Cohesion: 0.17
Nodes (11): refundPaymentHandler(), { DEMO_READ_ONLY_ADMIN }, requireDemoWriteAccess(), { createPayment, refundPayment }, {
  createPaymentHandler,
  paymentIpnHandler,
  paymentReturnHandler,
  queryPaymentStatusHandler,
  refundPaymentHandler,
}, express, { requireAdmin }, { requireAuth } (+3 more)

### Community 85 - "databaseHardening.test.js"
Cohesion: 0.20
Nodes (9): assert, { createInMemorySupabase }, { createResponse }, fs, { loadWithMocks }, migration, migrationPath, path (+1 more)

### Community 86 - "realtimeChat.test.js"
Cohesion: 0.14
Nodes (14): clone(), createInMemorySupabase(), assert, createHarness(), { createInMemorySupabase }, { loadWithMocks }, test, assert (+6 more)

### Community 87 - "realtime.js"
Cohesion: 0.33
Nodes (4): app, assert, openapiDocument, test

### Community 88 - "class-variance-authority"
Cohesion: 0.40
Nodes (4): assert, fs, path, test

### Community 89 - "WishlistPage.jsx"
Cohesion: 0.33
Nodes (5): Button(), buttonVariants, EmptyState(), EmptyStateProps, ErrorStateProps

### Community 90 - "frontend/src/services/reviewService.js"
Cohesion: 0.40
Nodes (4): Core ERD, Deployment architecture, Idempotent payment callback, ReMarket architecture

### Community 91 - "clsx"
Cohesion: 0.31
Nodes (7): ConfirmDialogProps, DialogBackdrop(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogTitle()

### Community 92 - "tailwind-merge"
Cohesion: 0.15
Nodes (18): App(), AdminRoute(), AgentRoute(), AuthOnlyRoute(), ProtectedRoute(), RootRedirect(), Navbar(), AgentInboxPage() (+10 more)

### Community 93 - "frontend/src/services/reviewService.js"
Cohesion: 0.28
Nodes (6): Badge(), badgeVariants, StatusBadgeProps, statusLabels, StatusTone, statusTones

### Community 95 - "realtime.js"
Cohesion: 0.39
Nodes (7): buildPaymentIdempotencyKey(), { createHash }, { processPaymentCallback }, processVerifiedPaymentCallback(), sanitizeGatewayPayload(), stableSerialize(), processPaymentCallback()

### Community 96 - "form-field.tsx"
Cohesion: 0.47
Nodes (3): FormField(), FormFieldProps, Input()

## Knowledge Gaps
- **626 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `tabWidth` (+621 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `status()` connect `errorHandling.test.js` to `authorizationFlows.test.js`, `AdminDashboardPage.jsx`, `ChatPage.jsx`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Why does `ProductDetailPage()` connect `authorizationFlows.test.js` to `ClientHomePage.jsx`, `frontend/package.json`, `errorHandling.test.js`, `MyProductsPage.jsx`, `ChatPage.jsx`, `tailwind-merge`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `TransactionHistoryPage()` connect `ChatPage.jsx` to `authorizationFlows.test.js`, `errorHandling.test.js`, `tailwind-merge`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _626 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `authController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06001984126984127 - nodes in this community are weakly interconnected._
- **Should `ClientHomePage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10510510510510511 - nodes in this community are weakly interconnected._
- **Should `authService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12077294685990338 - nodes in this community are weakly interconnected._