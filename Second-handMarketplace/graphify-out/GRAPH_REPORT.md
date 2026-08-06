# Graph Report - Second-handMarketplace  (2026-08-06)

## Corpus Check
- 298 files · ~121,361 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2061 nodes · 4003 edges · 136 communities (126 shown, 10 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 289 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c11253fa`
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
- notificationService.ts
- databaseHardening.test.js
- realtimeChat.test.js
- realtime.js
- class-variance-authority
- WishlistPage.jsx
- frontend/src/services/reviewService.js
- clsx
- tailwind-merge
- ModerationPage.tsx
- server.js
- realtime.js
- PurchaseDialog.tsx
- vite-env.d.ts
- paymentExpiryWorker.js
- Button
- badge.tsx
- vnpayQuery.test.js
- paymentCallbackService.js
- ReviewList.tsx
- ReviewList.tsx
- Finding Animation Opportunities
- scripts
- adminService.js
- MarketplaceLayout.tsx
- Audit Areas
- verifyMarketplaceUpgrade.test.js
- ProfilePage.tsx
- sellerFollows.test.js
- error-state.tsx
- Design Engineering
- devDependencies
- Component Building Principles
- backend/package.json
- Supabase marketplace upgrade
- smartProductSearch.test.js
- The Animation Decision Framework
- clip-path for Animation
- Performance Rules
- Gesture and Drag Interactions
- productCommentsMigration.test.js
- vectorRagMigration.test.js
- CSS Transform Mastery
- The Sonner Principles (Building Loved Components)
- Spring Animations
- Core Philosophy
- Debugging Animations
- Web Interface Guidelines
- express-rate-limit

## God Nodes (most connected - your core abstractions)
1. `error()` - 62 edges
2. `cn()` - 60 edges
3. `useAuthStore` - 35 edges
4. `Button` - 31 edges
5. `Query` - 21 edges
6. `Product` - 21 edges
7. `compilerOptions` - 19 edges
8. `scripts` - 16 edges
9. `createNotification()` - 16 edges
10. `loadWithMocks()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `AdminDashboardPage()` --indirect_call--> `status()`  [INFERRED]
  frontend/src/pages/admin/AdminDashboardPage.tsx → backend/tests/errorHandling.test.js
- `MyProductsPage()` --indirect_call--> `status()`  [INFERRED]
  frontend/src/pages/client/MyProductsPage.tsx → backend/tests/errorHandling.test.js
- `withServer()` --indirect_call--> `error()`  [INFERRED]
  backend/tests/errorHandling.test.js → backend/tests/vectorEmbeddingWorker.test.js
- `SellerDashboard()` --indirect_call--> `status()`  [INFERRED]
  frontend/src/pages/client/SellerDashboard.tsx → backend/tests/errorHandling.test.js
- `TransactionHistoryPage()` --indirect_call--> `status()`  [INFERRED]
  frontend/src/pages/client/TransactionHistoryPage.tsx → backend/tests/errorHandling.test.js

## Import Cycles
- None detected.

## Communities (136 total, 10 thin omitted)

### Community 0 - "backend/src/services/transactionService.js"
Cohesion: 0.20
Nodes (22): buildServiceError(), { createClient }, { createNotification }, createTransaction(), enrichTransactionsWithProfilesAndReviews(), ensureProfileForUser(), expireUnpaidTransactions(), getAdminClient() (+14 more)

### Community 1 - "authController.js"
Cohesion: 0.07
Nodes (50): buildForgotPasswordHtml(), buildResendVerificationHtml(), buildSignupHtml(), canRequestNow(), changePasswordHandler(), {
  changeUserPassword,
  generateRecoveryLink,
  generateSignupLink,
  resendVerificationEmail,
}, {
  FORGOT_PASSWORD_COOLDOWN_SECONDS,
  MAIL_FROM_NAME,
  SIGNUP_COOLDOWN_SECONDS,
}, forgotRequestCooldownMap (+42 more)

### Community 2 - "ClientHomePage.jsx"
Cohesion: 0.15
Nodes (15): MarketplaceFilters, SearchFilterSidebarProps, buildSections(), ClientHomePage(), emptySections, HomeCache, readHomeCache(), writeHomeCache() (+7 more)

### Community 3 - "authService.js"
Cohesion: 0.08
Nodes (50): AuthFeedback(), AuthFeedbackProps, FeedbackTone, AuthLayoutProps, PasswordInput(), PasswordInputProps, FormField(), isSupabaseConfigured (+42 more)

### Community 4 - "devDependencies"
Cohesion: 0.11
Nodes (19): dependencies, cors, dotenv, express, helmet, multer, nodemailer, @supabase/supabase-js (+11 more)

### Community 5 - "authMiddleware.js"
Cohesion: 0.20
Nodes (18): { getWishlist, getWishlistStatus, toggleWishlist }, getWishlistHandler(), getWishlistStatusHandler(), sendError(), toggleWishlistHandler(), express, {
  getWishlistHandler,
  getWishlistStatusHandler,
  toggleWishlistHandler,
}, { requireAuth } (+10 more)

### Community 6 - "productModel.js"
Cohesion: 0.09
Nodes (49): ALLOWED_CONDITIONS, ALLOWED_PRODUCT_STATUSES, autocompleteProductsHandler(), {
  createProduct,
  getProductById,
  getPublicProductById,
  getPublicProducts,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
  getPublicProductsBySeller,
  hasOpenTransactionsForProduct,
  incrementProductViewCount,
  autocompleteProducts,
}, createProductHandler(), deleteProductHandler(), getMyProductsHandler(), getProductByIdHandler() (+41 more)

### Community 7 - "adminController.js"
Cohesion: 0.26
Nodes (19): {
  createReview,
  getReviewsByProduct,
  getReviewsByUser,
  getReviewForTransaction,
  getMyReviews,
}, createReviewHandler(), getMyReviewsHandler(), getReviewForTransactionHandler(), getReviewsByProductHandler(), getReviewsByUserHandler(), sendError(), attachReviewerProfiles() (+11 more)

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
Cohesion: 0.07
Nodes (52): evaluateScenario(), fs, main(), path, { retrieveAdvisorContext }, suite, { answerAiSupportQuestion }, askAiSupportHandler() (+44 more)

### Community 10 - "AdminDashboardPage.jsx"
Cohesion: 0.09
Nodes (38): ConfirmDialog(), AdminDashboardPage(), AdminTab, formatCurrency(), formatDate(), productLabels, transactionStatuses, UserCard() (+30 more)

### Community 11 - "backend/src/services/notificationService.js"
Cohesion: 0.17
Nodes (11): { DEMO_READ_ONLY_ADMIN }, requireDemoWriteAccess(), express, {
  getAdminOverviewHandler,
  getAdminUsersHandler,
  getAdminProductsHandler,
  updateProductStatusByAdminHandler,
  getAdminTransactionsHandler,
  createUserHandler,
  updateUserRoleHandler,
  updateUserStatusHandler,
}, {
  getModerationReportsHandler,
  moderateReportHandler,
}, { moderateReport }, { requireAdmin, requireAdminOrAgent }, { requireAuth } (+3 more)

### Community 12 - "App.jsx"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 14 - "backend/src/services/reviewService.js"
Cohesion: 0.04
Nodes (45): @axe-core/playwright, eslint-plugin-react, eslint-plugin-react-hooks, devDependencies, @axe-core/playwright, eslint, eslint-config-prettier, eslint-plugin-react (+37 more)

### Community 15 - "NotificationsPage.jsx"
Cohesion: 0.21
Nodes (17): getProductImage(), ProductCard(), formatDate(), ProductInformation(), statusLabels, ProductPurchasePanel(), PurchaseDialog(), useToast() (+9 more)

### Community 16 - "supabaseClient.js"
Cohesion: 0.14
Nodes (13): createObservabilityMiddleware(), logger, isSensitiveKey(), redact(), SENSITIVE_KEYS, write(), app, assert (+5 more)

### Community 17 - "app.js"
Cohesion: 0.07
Nodes (37): ChatEmptyState(), ChatMessageBubble(), ChatMessageBubbleProps, ChatProductCard(), ProductCardData, ChatPage(), ChatPageProps, ConnectionStatus (+29 more)

### Community 18 - "ProductDetailPage.jsx"
Cohesion: 0.17
Nodes (21): createPaymentHandler(), {
  expireUnpaidTransactions,
  markTransactionPaymentCreated,
  prepareTransactionPayment,
}, getClientIp(), getIpnResponse(), { getPayment, updatePaymentFromGateway, upsertPayment }, getRequestBaseUrl(), handleVerifiedResult(), normalizePaymentPayload() (+13 more)

### Community 19 - "TransactionHistoryPage.jsx"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 20 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 21 - "dependencies"
Cohesion: 0.04
Nodes (48): @base-ui/react, class-variance-authority, clsx, @fontsource-variable/geist, author, dependencies, @base-ui/react, class-variance-authority (+40 more)

### Community 22 - "MomoStrategy.js"
Cohesion: 0.25
Nodes (6): { createHmacSignature, verifyHmacSignature }, createRequestId(), MomoStrategy, PaymentStrategy, requireConfig(), createHmacSignature()

### Community 23 - "PaymentContext.js"
Cohesion: 0.22
Nodes (13): actionLabels, formatDate(), ModerationPage(), statusOptions, createProductReport(), getAccessToken(), getModerationReports(), moderateReport() (+5 more)

### Community 24 - "dependencies"
Cohesion: 0.18
Nodes (10): Database hardening, Hybrid vector RAG, Moderation reports, Payment callback idempotency, Product comments from completed transactions, Realtime chat, Seller follows and price notifications, Smart product search (+2 more)

### Community 25 - "VnpayStrategy.js"
Cohesion: 0.20
Nodes (10): buildQueryResponseSignaturePayload(), {
  buildVnpayHashData,
  buildVnpayQuery,
  createHmacSignature,
  sortObject,
  verifyHmacSignature,
}, createQueryRequestId(), crypto, formatVnpayDate(), getClientIp(), pad(), PaymentStrategy (+2 more)

### Community 26 - "signature.js"
Cohesion: 0.42
Nodes (10): backendUrl(), createReview(), getAccessToken(), getMyReviewForTransaction(), getMyReviews(), getReviewsByProduct(), getReviewsByUser(), parse() (+2 more)

### Community 27 - "signature.js"
Cohesion: 0.26
Nodes (12): buildRawSignatureString(), buildVnpayHashData(), buildVnpayQuery(), crypto, encodeVnpayValue(), sortObject(), timingSafeEqual(), verifyHmacSignature() (+4 more)

### Community 28 - "categoryRoutes.js"
Cohesion: 0.06
Nodes (30): adminRoutes, aiSupportRoutes, { apiRateLimiter }, app, authRoutes, categoryRoutes, chatRoutes, configuredFrontendOrigin (+22 more)

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
Cohesion: 0.06
Nodes (31): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx (+23 more)

### Community 34 - "frontend/package.json"
Cohesion: 0.18
Nodes (10): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+2 more)

### Community 35 - "AiSupportWidget.jsx"
Cohesion: 0.17
Nodes (16): ProductGallery(), ProductGalleryProps, ProductReportInput, ReportDialog(), SellerCard(), getProductImages(), ProductDetailPage(), readProductCache() (+8 more)

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
Cohesion: 0.19
Nodes (12): { checkReadiness }, healthHandler(), readinessHandler(), express, { healthHandler, readinessHandler }, router, checkReadiness(), { createClient } (+4 more)

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
Cohesion: 0.05
Nodes (51): { getSellerFollowStatus, toggleSellerFollow }, getSellerFollowStatusHandler(), sendError(), toggleSellerFollowHandler(), { getProfile, updateProfile, uploadAvatar }, getProfileHandler(), updateProfileHandler(), uploadAvatarHandler() (+43 more)

### Community 50 - "tailwind.config.js"
Cohesion: 0.39
Nodes (6): AiSupportWidget(), createMessage(), initialMessages, SupportMessage, AiSupportAnswer, askAiSupport()

### Community 54 - "transactionRoutes.js"
Cohesion: 0.10
Nodes (24): AppError, formatIssues(), validateRequest(), { createReview }, {
  createReviewHandler,
  getReviewsByProductHandler,
  getReviewsByUserHandler,
  getReviewForTransactionHandler,
  getMyReviewsHandler,
}, express, { requireAuth }, router (+16 more)

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
Cohesion: 0.12
Nodes (16): assert, { loadWithMocks }, test, loadWithMocks(), assert, createHarness(), { createResponse }, { loadWithMocks } (+8 more)

### Community 66 - "PaymentContext.js"
Cohesion: 0.15
Nodes (5): MomoStrategy, paymentConfig, PaymentContext, strategyFactories, VnpayStrategy

### Community 67 - "paymentRoutes.js"
Cohesion: 0.25
Nodes (7): assert, migration, path, paymentLifecycleMigration, { readFileSync }, rejectionReasonMigration, test

### Community 68 - "categoryRoutes.js"
Cohesion: 0.23
Nodes (9): { getCategories }, getCategoriesHandler(), express, { getCategoriesHandler }, router, { createClient }, getAdminClient(), getCategories() (+1 more)

### Community 69 - "paymentWebhookFlows.test.js"
Cohesion: 0.17
Nodes (15): { ADMIN_EMAILS, AGENT_EMAILS }, isAdminUser(), isAgentUser(), parseAdminEmails(), parseAgentEmails(), requireAdmin(), requireAdminOrAgent(), assert (+7 more)

### Community 70 - "transactionFlows.test.js"
Cohesion: 0.11
Nodes (17): clone(), createInMemorySupabase(), OPEN_TRANSACTION_STATUSES, assert, createHarness(), { createInMemorySupabase }, { loadWithMocks }, test (+9 more)

### Community 71 - "paymentExpiryWorker.js"
Cohesion: 0.14
Nodes (15): readStoredTheme(), Theme, ThemeContext, ThemeContextValue, ThemeProvider(), useTheme(), ToastContext, ToastContextValue (+7 more)

### Community 72 - "authorizationFlows.test.js"
Cohesion: 0.25
Nodes (7): ProductCardProps, ProductSectionProps, ProductPurchasePanelProps, SellerCardProps, HomeSections, ProductCache, Product

### Community 73 - "AiSupportWidget.jsx"
Cohesion: 0.18
Nodes (17): {
  createTransaction,
  getTransactionById,
  getTransactions,
  getTransactionStats,
  updateTransactionStatus,
}, createTransactionHandler(), { getProductById }, getTransactionByIdHandler(), getTransactionsHandler(), getTransactionStatsHandler(), sendError(), updateTransactionStatusHandler() (+9 more)

### Community 74 - "ReMarket RLS policies"
Cohesion: 0.50
Nodes (3): Browser/backend access boundary, Realtime chat, ReMarket RLS policies

### Community 75 - "errorHandling.test.js"
Cohesion: 0.15
Nodes (10): AppError, AppError, errorHandler(), normalizeError(), notFoundHandler(), app, assert, { errorHandler } (+2 more)

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
Cohesion: 0.19
Nodes (24): filters, formatCurrency(), MyProductsPage(), productImage(), categories, initialForm, ProductFormErrors, ProductFormPage() (+16 more)

### Community 82 - "ChatPage.jsx"
Cohesion: 0.14
Nodes (27): status(), transaction(), CardContent(), ErrorState(), StatusBadge(), filters, formatCurrency(), formatDate() (+19 more)

### Community 83 - "frontend/src/services/reviewService.js"
Cohesion: 0.06
Nodes (49): buildServiceError(), callGeminiEmbeddings(), callOpenAiEmbeddings(), {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_PROVIDER,
  EMBEDDING_VERSION,
  VECTOR_RAG_ENABLED,
}, generateEmbeddings(), generateQueryEmbedding(), getEmbeddingConfig(), isEmbeddingConfigured() (+41 more)

### Community 84 - "notificationService.ts"
Cohesion: 0.42
Nodes (5): WishlistPage(), getWishlist(), parseResult(), WishlistResult, WishlistItem

### Community 85 - "databaseHardening.test.js"
Cohesion: 0.13
Nodes (14): assert, { createInMemorySupabase }, { createResponse }, fs, { loadWithMocks }, migration, migrationPath, path (+6 more)

### Community 86 - "realtimeChat.test.js"
Cohesion: 0.33
Nodes (5): app, assert, openapiDocument, test, withServer()

### Community 87 - "realtime.js"
Cohesion: 0.07
Nodes (25): Aggressive Escalation Triggers, Guidelines, Operating Posture, Part 1 — Findings table (REQUIRED), Part 2 — Verdict (REQUIRED), Remedial Preference Hierarchy, Required Output Format, Reviewing Animations (+17 more)

### Community 88 - "class-variance-authority"
Cohesion: 0.40
Nodes (4): assert, fs, path, test

### Community 89 - "WishlistPage.jsx"
Cohesion: 0.20
Nodes (9): refundPaymentHandler(), { createPayment, refundPayment }, {
  createPaymentHandler,
  paymentIpnHandler,
  paymentReturnHandler,
  queryPaymentStatusHandler,
  refundPaymentHandler,
}, express, { requireAdmin }, { requireAuth }, { requireDemoWriteAccess }, router (+1 more)

### Community 90 - "frontend/src/services/reviewService.js"
Cohesion: 0.40
Nodes (4): Core ERD, Deployment architecture, Idempotent payment callback, ReMarket architecture

### Community 91 - "clsx"
Cohesion: 0.40
Nodes (4): {
  API_RATE_LIMIT_MAX,
  API_RATE_LIMIT_WINDOW_MS,
  AUTH_EMAIL_RATE_LIMIT_MAX,
  AUTH_EMAIL_RATE_LIMIT_WINDOW_MS,
}, apiRateLimiter, authEmailRateLimiter, { rateLimit }

### Community 92 - "tailwind-merge"
Cohesion: 0.05
Nodes (54): AdminDashboardPage, AgentInboxPage, AiSupportWidget, App(), ChangePasswordPage, ChatPage, ClientHomePage, ForbiddenPage (+46 more)

### Community 94 - "server.js"
Cohesion: 0.25
Nodes (4): dotenv, { FRONTEND_ORIGIN }, app, { PORT }

### Community 95 - "realtime.js"
Cohesion: 0.12
Nodes (13): { createReport }, { createReportHandler, getMyReportsHandler }, express, { requireAuth }, router, validateRequest, createReport, assert (+5 more)

### Community 96 - "PurchaseDialog.tsx"
Cohesion: 0.10
Nodes (32): primaryLinks, SearchBar(), SearchBarProps, SearchFilterSidebar(), ReportDialogProps, ThemeToggle(), Avatar(), AvatarProps (+24 more)

### Community 99 - "paymentExpiryWorker.js"
Cohesion: 0.23
Nodes (8): createPaymentExpiryWorker(), { expireUnpaidTransactions }, startStandaloneWorker(), { createPaymentExpiryWorker }, runPaymentExpiryOnce(), assert, {
  DEFAULT_INTERVAL_MS,
  createPaymentExpiryWorker,
}, test

### Community 100 - "Button"
Cohesion: 0.17
Nodes (14): {
  enqueueEmbeddingReindex,
  syncKnowledgeDocuments,
}, aiKnowledgeBase, aiKnowledgeBase, chunkDocument(), contentHash(), { createClient }, crypto, {
  EMBEDDING_MODEL,
  EMBEDDING_VERSION,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} (+6 more)

### Community 101 - "badge.tsx"
Cohesion: 0.32
Nodes (6): Badge(), badgeVariants, StatusBadgeProps, statusLabels, StatusTone, statusTones

### Community 102 - "vnpayQuery.test.js"
Cohesion: 0.29
Nodes (5): assert, config, crypto, test, VnpayStrategy

### Community 103 - "paymentCallbackService.js"
Cohesion: 0.39
Nodes (7): buildPaymentIdempotencyKey(), { createHash }, { processPaymentCallback }, processVerifiedPaymentCallback(), sanitizeGatewayPayload(), stableSerialize(), processPaymentCallback()

### Community 104 - "ReviewList.tsx"
Cohesion: 0.47
Nodes (3): formatDate(), ReviewList(), ReviewListProps

### Community 105 - "ReviewList.tsx"
Cohesion: 0.29
Nodes (15): {
  createReport,
  getModerationReports,
  getMyReports,
  moderateReport,
}, createReportHandler(), getModerationReportsHandler(), getMyReportsHandler(), moderateReportHandler(), sendError(), buildServiceError(), { createClient } (+7 more)

### Community 108 - "Finding Animation Opportunities"
Cohesion: 0.12
Nodes (15): 1. Frequency — how often will a user see this?, 2. Purpose — why does this animate?, 3. Speed — can it stay inside budget?, 4. Function — does motion help or hinder here?, Finding Animation Opportunities, Hard Rules, Operating Posture, Part 1 — Opportunities table (+7 more)

### Community 109 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, dev, format, format:check, lint, lint:fix, rag:evaluate, rag:sync-knowledge (+8 more)

### Community 110 - "adminService.js"
Cohesion: 0.23
Nodes (24): createUserHandler(), {
  getAdminOverview,
  getAdminUsers,
  getAdminProducts,
  updateProductStatusByAdmin,
  getAdminTransactions,
  updateUserRole,
  updateUserStatus,
  createUser,
}, getAdminOverviewHandler(), getAdminProductsHandler(), getAdminTransactionsHandler(), getAdminUsersHandler(), sendError(), updateProductStatusByAdminHandler() (+16 more)

### Community 111 - "MarketplaceLayout.tsx"
Cohesion: 0.12
Nodes (17): MarketplaceLayout(), MarketplaceLayoutProps, PurchaseDialogProps, Skeleton(), filters, kindConfig, NotificationKind, PaymentReturnPage() (+9 more)

### Community 112 - "Audit Areas"
Cohesion: 0.15
Nodes (12): Accessibility and Semantics, Audit Areas, Color and Surfaces, Components and Icons, Content, Fix Priority, Interaction and States, Layout and Responsiveness (+4 more)

### Community 113 - "verifyMarketplaceUpgrade.test.js"
Cohesion: 0.23
Nodes (11): { createClient }, main(), summarizeError(), { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL }, verifyMarketplaceUpgrade(), assert, from(), queryResult() (+3 more)

### Community 114 - "ProfilePage.tsx"
Cohesion: 0.16
Nodes (14): SystemStatusPage(), SystemStatusPageProps, buttonVariants, formatDate(), ProfileErrors, ProfilePage(), validateProfileForm(), getAccessToken() (+6 more)

### Community 115 - "sellerFollows.test.js"
Cohesion: 0.20
Nodes (9): assert, { createInMemorySupabase }, { createResponse }, envModulePath, fs, { loadWithMocks }, path, test (+1 more)

### Community 116 - "error-state.tsx"
Cohesion: 0.60
Nodes (3): EmptyState(), EmptyStateProps, ErrorStateProps

### Community 117 - "Design Engineering"
Cohesion: 0.22
Nodes (8): Accessibility, Design Engineering, Initial Response, prefers-reduced-motion, Review Checklist, Review Format (Required), Stagger Animations, Touch device hover states

### Community 118 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, eslint, eslint-config-prettier, nodemon, prettier, eslint, eslint-config-prettier, prettier (+1 more)

### Community 119 - "Component Building Principles"
Cohesion: 0.25
Nodes (8): Animate enter states with @starting-style, Buttons must feel responsive, Component Building Principles, Make popovers origin-aware, Never animate from scale(0), Tooltips: skip delay on subsequent hovers, Use blur to mask imperfect transitions, Use CSS transitions over keyframes for interruptible UI

### Community 120 - "backend/package.json"
Cohesion: 0.25
Nodes (7): author, description, keywords, license, main, name, version

### Community 121 - "Supabase marketplace upgrade"
Cohesion: 0.25
Nodes (7): Chức năng của từng migration, Khởi tạo vector RAG, Kiểm tra schema live, Quyền riêng tư và chi phí provider, Smoke test, Supabase marketplace upgrade, Thứ tự áp dụng

### Community 122 - "smartProductSearch.test.js"
Cohesion: 0.25
Nodes (7): aiSupportService, assert, fs, { loadWithMocks }, path, { scoreProductMatch }, test

### Community 123 - "The Animation Decision Framework"
Cohesion: 0.33
Nodes (6): 1. Should this animate at all?, 2. What is the purpose?, 3. What easing should it use?, 4. How fast should it be?, Perceived performance, The Animation Decision Framework

### Community 124 - "clip-path for Animation"
Cohesion: 0.33
Nodes (6): clip-path for Animation, Comparison sliders, Hold-to-delete pattern, Image reveals on scroll, Tabs with perfect color transitions, The inset shape

### Community 125 - "Performance Rules"
Cohesion: 0.33
Nodes (6): CSS animations beat JS under load, CSS variables are inheritable, Framer Motion hardware acceleration caveat, Only animate transform and opacity, Performance Rules, Use WAAPI for programmatic CSS animations

### Community 126 - "Gesture and Drag Interactions"
Cohesion: 0.33
Nodes (6): Damping at boundaries, Friction instead of hard stops, Gesture and Drag Interactions, Momentum-based dismissal, Multi-touch protection, Pointer capture for drag

### Community 127 - "productCommentsMigration.test.js"
Cohesion: 0.33
Nodes (5): assert, fs, migration, path, test

### Community 128 - "vectorRagMigration.test.js"
Cohesion: 0.33
Nodes (5): assert, fs, migration, path, test

### Community 129 - "CSS Transform Mastery"
Cohesion: 0.40
Nodes (5): 3D transforms for depth, CSS Transform Mastery, scale() scales children too, transform-origin, translateY with percentages

### Community 130 - "The Sonner Principles (Building Loved Components)"
Cohesion: 0.40
Nodes (5): Asymmetric enter/exit timing, Cohesion matters, Review your work the next day, The opacity + height combination, The Sonner Principles (Building Loved Components)

### Community 131 - "Spring Animations"
Cohesion: 0.40
Nodes (5): Interruptibility advantage, Spring Animations, Spring-based mouse interactions, Spring configuration, When to use springs

### Community 132 - "Core Philosophy"
Cohesion: 0.50
Nodes (4): Beauty is leverage, Core Philosophy, Taste is trained, not innate, Unseen details compound

### Community 133 - "Debugging Animations"
Cohesion: 0.50
Nodes (4): Debugging Animations, Frame-by-frame inspection, Slow motion testing, Test on real devices

## Knowledge Gaps
- **881 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `tabWidth` (+876 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `status()` connect `ChatPage.jsx` to `MyProductsPage.jsx`, `AdminDashboardPage.jsx`, `errorHandling.test.js`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `tailwind-merge` to `PurchaseDialog.tsx`, `authService.js`, `AiSupportWidget.jsx`, `NotificationsPage.jsx`, `MarketplaceLayout.tsx`, `app.js`, `MyProductsPage.jsx`, `ProfilePage.tsx`, `ChatPage.jsx`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `TransactionHistoryPage()` connect `ChatPage.jsx` to `app.js`, `signature.js`, `tailwind-merge`, `MarketplaceLayout.tsx`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Are the 61 inferred relationships involving `error()` (e.g. with `verifyMarketplaceUpgrade()` and `createUserHandler()`) actually correct?**
  _`error()` has 61 INFERRED edges - model-reasoned connections that need verification._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _881 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `authController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07012987012987013 - nodes in this community are weakly interconnected._
- **Should `authService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08269230769230769 - nodes in this community are weakly interconnected._