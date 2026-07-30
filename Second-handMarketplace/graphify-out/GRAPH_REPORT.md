# Graph Report - Second-handMarketplace (2026-07-30)

## Corpus Check

- 253 files · ~95,709 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 1650 nodes · 3364 edges · 97 communities (89 shown, 8 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 186 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `87d46630`
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
- server.js
- realtime.js
- vite-env.d.ts

## God Nodes (most connected - your core abstractions)

1. `cn()` - 62 edges
2. `useAuthStore` - 35 edges
3. `Button` - 30 edges
4. `Query` - 20 edges
5. `compilerOptions` - 20 edges
6. `Product` - 19 edges
7. `ChatPage()` - 16 edges
8. `MarketplaceLayout()` - 15 edges
9. `Skeleton()` - 15 edges
10. `buildServiceError()` - 14 edges

## Surprising Connections (you probably didn't know these)

- `AdminDashboardPage()` --indirect_call--> `status()` [INFERRED]
  frontend/src/pages/admin/AdminDashboardPage.tsx → backend/tests/errorHandling.test.js
- `MyProductsPage()` --indirect_call--> `status()` [INFERRED]
  frontend/src/pages/client/MyProductsPage.tsx → backend/tests/errorHandling.test.js
- `SellerDashboard()` --indirect_call--> `status()` [INFERRED]
  frontend/src/pages/client/SellerDashboard.tsx → backend/tests/errorHandling.test.js
- `TransactionHistoryPage()` --indirect_call--> `status()` [INFERRED]
  frontend/src/pages/client/TransactionHistoryPage.tsx → backend/tests/errorHandling.test.js
- `SellerDashboard()` --indirect_call--> `transaction()` [INFERRED]
  frontend/src/pages/client/SellerDashboard.tsx → backend/tests/transactionFlows.test.js

## Import Cycles

- None detected.

## Communities (97 total, 8 thin omitted)

### Community 0 - "backend/src/services/transactionService.js"

Cohesion: 0.05
Nodes (73): createPaymentHandler(), {

expireUnpaidTransactions,

markTransactionPaymentCreated,

prepareTransactionPayment,

}, getClientIp(), getIpnResponse(), { getPayment, updatePaymentFromGateway, upsertPayment }, getRequestBaseUrl(), handleVerifiedResult(), normalizePaymentPayload() (+65 more)

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

Cohesion: 0.13
Nodes (16): SearchFilterSidebarProps, EmptyState(), EmptyStateProps, ErrorStateProps, buildSections(), ClientHomePage(), emptySections, HomeCache (+8 more)

### Community 3 - "authService.js"

Cohesion: 0.06
Nodes (69): AuthFeedback(), AuthFeedbackProps, FeedbackTone, AuthLayoutProps, PasswordInput(), PasswordInputProps, readStoredTheme(), Theme (+61 more)

### Community 4 - "devDependencies"

Cohesion: 0.04
Nodes (48): author, dependencies, cors, dotenv, express, express-rate-limit, helmet, multer (+40 more)

### Community 5 - "authMiddleware.js"

Cohesion: 0.06
Nodes (53): { getProfile, updateProfile, uploadAvatar }, getProfileHandler(), updateProfileHandler(), uploadAvatarHandler(), { uploadImage }, uploadImagesHandler(), { getWishlist, getWishlistStatus, toggleWishlist }, getWishlistHandler() (+45 more)

### Community 6 - "productModel.js"

Cohesion: 0.11
Nodes (40): ALLOWED_CONDITIONS, ALLOWED_PRODUCT_STATUSES, autocompleteProductsHandler(), {

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

}, createProductHandler(), deleteProductHandler(), getMyProductsHandler(), getProductByIdHandler() (+32 more)

### Community 7 - "adminController.js"

Cohesion: 0.22
Nodes (23): createUserHandler(), {

getAdminOverview,

getAdminUsers,

getAdminProducts,

updateProductStatusByAdmin,

getAdminTransactions,

updateUserRole,

updateUserStatus,

createUser,

}, getAdminOverviewHandler(), getAdminProductsHandler(), getAdminTransactionsHandler(), getAdminUsersHandler(), sendError(), updateProductStatusByAdminHandler() (+15 more)

### Community 8 - "backend/src/services/chatService.js"

Cohesion: 0.08
Nodes (58): ensureConversationHandler(), {
getConversations,
getMessages,
sendMessage,
ensureConversation,
markConversationRead,
getUnreadConversationCount,
}, getConversationsHandler(), getMessagesHandler(), getUnreadConversationCountHandler(), markConversationReadHandler(), sendError(), sendMessageHandler() (+50 more)

### Community 9 - "backend/src/services/aiSupportService.js"

Cohesion: 0.13
Nodes (26): { answerAiSupportQuestion }, askAiSupportHandler(), sendError(), aiKnowledgeBase, { askAiSupportHandler }, express, router, aiKnowledgeBase (+18 more)

### Community 10 - "AdminDashboardPage.jsx"

Cohesion: 0.14
Nodes (25): AdminDashboardPage(), AdminTab, formatCurrency(), formatDate(), productLabels, transactionStatuses, UserCard(), UserItemProps (+17 more)

### Community 11 - "backend/src/services/notificationService.js"

Cohesion: 0.17
Nodes (22): {

createReview,

getReviewsByUser,

getReviewForTransaction,

getMyReviews,

}, createReviewHandler(), getMyReviewsHandler(), getReviewForTransactionHandler(), getReviewsByUserHandler(), sendError(), { createReview }, {

createReviewHandler,

getReviewsByUserHandler,

getReviewForTransactionHandler,

getMyReviewsHandler,

} (+14 more)

### Community 12 - "App.jsx"

Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 14 - "backend/src/services/reviewService.js"

Cohesion: 0.05
Nodes (41): eslint-plugin-react, eslint-plugin-react-hooks, devDependencies, eslint, eslint-config-prettier, eslint-plugin-react, eslint-plugin-react-hooks, jsdom (+33 more)

### Community 15 - "NotificationsPage.jsx"

Cohesion: 0.12
Nodes (27): getProductImage(), ProductCard(), ProductCardProps, ProductSectionProps, ProductGallery(), ProductGalleryProps, ProductPurchasePanel(), ProductPurchasePanelProps (+19 more)

### Community 16 - "supabaseClient.js"

Cohesion: 0.14
Nodes (13): createObservabilityMiddleware(), logger, isSensitiveKey(), redact(), SENSITIVE_KEYS, write(), app, assert (+5 more)

### Community 17 - "app.js"

Cohesion: 0.14
Nodes (24): ChatEmptyState(), ChatMessageBubble(), ChatMessageBubbleProps, ChatProductCard(), ProductCardData, ChatPage(), formatConversationTime(), formatTime() (+16 more)

### Community 18 - "ProductDetailPage.jsx"

Cohesion: 0.26
Nodes (10): App(), AdminRoute(), AgentRoute(), AuthOnlyRoute(), ProtectedRoute(), RootRedirect(), AgentInboxPage(), SupportChatPage() (+2 more)

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

Cohesion: 0.23
Nodes (6): { createHmacSignature, verifyHmacSignature }, createRequestId(), MomoStrategy, PaymentStrategy, requireConfig(), createHmacSignature()

### Community 23 - "PaymentContext.js"

Cohesion: 0.14
Nodes (24): formatDate(), ReviewList(), ReviewListProps, formatDate(), ProfileErrors, ProfilePage(), validateProfileForm(), getAccessToken() (+16 more)

### Community 24 - "dependencies"

Cohesion: 0.29
Nodes (6): Database hardening, Moderation reports, Payment callback idempotency, Realtime chat, Supabase schema invariants, Transactions

### Community 25 - "VnpayStrategy.js"

Cohesion: 0.22
Nodes (7): {

buildVnpayHashData,

buildVnpayQuery,

createHmacSignature,

sortObject,

verifyHmacSignature,

}, formatVnpayDate(), getClientIp(), pad(), PaymentStrategy, requireConfig(), VnpayStrategy

### Community 26 - "signature.js"

Cohesion: 0.36
Nodes (6): AiSupportWidget(), createMessage(), initialMessages, SupportMessage, AiSupportAnswer, askAiSupport()

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

Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 35 - "AiSupportWidget.jsx"

Cohesion: 0.08
Nodes (18): AppError, AppError, formatIssues(), validateRequest(), { createReport }, { createReportHandler, getMyReportsHandler }, express, { requireAuth } (+10 more)

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

Cohesion: 0.16
Nodes (16): { ADMIN_EMAILS, AGENT_EMAILS }, isAdminUser(), isAgentUser(), parseAdminEmails(), parseAgentEmails(), requireAdmin(), requireAdminOrAgent(), express (+8 more)

### Community 50 - "tailwind.config.js"

Cohesion: 0.11
Nodes (18): PurchaseDialogProps, CreatePaymentInput, CreatePaymentResult, CreateTransactionInput, AdminProductListResult, AdminTransactionListResult, AdminUserListResult, ApiErrorPayload (+10 more)

### Community 54 - "transactionRoutes.js"

Cohesion: 0.17
Nodes (15): createPayment, createProduct, createReview, createTransaction, idParamsSchema, nonEmptyString, paymentMethodSchema, sendChatMessage (+7 more)

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

Cohesion: 0.19
Nodes (9): assert, { loadWithMocks }, test, loadWithMocks(), assert, createHarness(), { createResponse }, { loadWithMocks } (+1 more)

### Community 66 - "PaymentContext.js"

Cohesion: 0.13
Nodes (6): { FRONTEND_ORIGIN }, MomoStrategy, paymentConfig, PaymentContext, strategyFactories, VnpayStrategy

### Community 67 - "paymentRoutes.js"

Cohesion: 0.33
Nodes (5): assert, migration, path, { readFileSync }, test

### Community 68 - "categoryRoutes.js"

Cohesion: 0.23
Nodes (9): { getCategories }, getCategoriesHandler(), express, { getCategoriesHandler }, router, { createClient }, getAdminClient(), getCategories() (+1 more)

### Community 69 - "paymentWebhookFlows.test.js"

Cohesion: 0.14
Nodes (13): assert, { createInMemorySupabase }, { createResponse }, envModulePath, { loadWithMocks }, { requireAdmin, requireAdminOrAgent }, test, testSupabaseEnv (+5 more)

### Community 70 - "transactionFlows.test.js"

Cohesion: 0.18
Nodes (9): assert, createFixture(), { createInMemorySupabase }, envModulePath, { loadWithMocks }, notificationServicePath, supabaseModulePath, test (+1 more)

### Community 71 - "paymentExpiryWorker.js"

Cohesion: 0.29
Nodes (15): {

createReport,

getModerationReports,

getMyReports,

moderateReport,

}, createReportHandler(), getModerationReportsHandler(), getMyReportsHandler(), moderateReportHandler(), sendError(), buildServiceError(), { createClient } (+7 more)

### Community 72 - "authorizationFlows.test.js"

Cohesion: 0.15
Nodes (17): ToastContext, ToastContextValue, ToastInput, ToastProvider(), ToastRecord, ToastTone, toneStyles, rootElement (+9 more)

### Community 73 - "AiSupportWidget.jsx"

Cohesion: 0.29
Nodes (6): SystemStatusPage(), SystemStatusPageProps, buttonVariants, ForbiddenPage(), NotFoundPage(), ServerErrorPage()

### Community 74 - "ReMarket RLS policies"

Cohesion: 0.50
Nodes (3): Browser/backend access boundary, Realtime chat, ReMarket RLS policies

### Community 75 - "errorHandling.test.js"

Cohesion: 0.20
Nodes (8): AppError, errorHandler(), normalizeError(), notFoundHandler(), app, assert, { errorHandler }, test

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

Cohesion: 0.17
Nodes (25): ConfirmDialog(), filters, formatCurrency(), MyProductsPage(), productImage(), categories, initialForm, ProductFormErrors (+17 more)

### Community 82 - "ChatPage.jsx"

Cohesion: 0.12
Nodes (30): status(), transaction(), MarketplaceLayout(), MarketplaceLayoutProps, Card(), CardContent(), ErrorState(), Skeleton() (+22 more)

### Community 83 - "frontend/src/services/reviewService.js"

Cohesion: 0.32
Nodes (6): Badge(), badgeVariants, StatusBadgeProps, statusLabels, StatusTone, statusTones

### Community 84 - "notificationService.ts"

Cohesion: 0.23
Nodes (15): filters, formatDate(), kindConfig, kindOf(), metadataOf(), NotificationKind, NotificationsPage(), targetOf() (+7 more)

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

Cohesion: 0.15
Nodes (12): refundPaymentHandler(), { DEMO_READ_ONLY_ADMIN }, requireDemoWriteAccess(), { createPayment, refundPayment }, {

createPaymentHandler,

paymentIpnHandler,

paymentReturnHandler,

queryPaymentStatusHandler,

refundPaymentHandler,

}, express, { requireAdmin }, { requireAuth } (+4 more)

### Community 90 - "frontend/src/services/reviewService.js"

Cohesion: 0.40
Nodes (4): Core ERD, Deployment architecture, Idempotent payment callback, ReMarket architecture

### Community 91 - "clsx"

Cohesion: 0.10
Nodes (35): SearchBar(), SearchBarProps, MarketplaceFilters, SearchFilterSidebar(), iconMap, SidebarCategory(), ReportDialogProps, SellerCard() (+27 more)

### Community 92 - "tailwind-merge"

Cohesion: 0.27
Nodes (10): Navbar(), primaryLinks, useRealtimeBadges(), getUnreadConversationCount(), getUnreadNotificationCount(), getUserRole(), isAdminUser(), isAgentUser() (+2 more)

### Community 95 - "realtime.js"

Cohesion: 0.70
Nodes (3): createRealtimeRefreshQueue(), mergeRealtimeMessages(), messageIdentity()

## Knowledge Gaps

- **639 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `tabWidth` (+634 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `status()` connect `ChatPage.jsx` to `MyProductsPage.jsx`, `AdminDashboardPage.jsx`, `errorHandling.test.js`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `ProductDetailPage.jsx` to `authService.js`, `NotificationsPage.jsx`, `MyProductsPage.jsx`, `app.js`, `ChatPage.jsx`, `notificationService.ts`, `PaymentContext.js`, `tailwind-merge`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `TransactionHistoryPage()` connect `ChatPage.jsx` to `ProductDetailPage.jsx`, `realtime.js`, `PaymentContext.js`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _639 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `backend/src/services/transactionService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.051131354687040845 - nodes in this community are weakly interconnected._
- **Should `authController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06001984126984127 - nodes in this community are weakly interconnected._
- **Should `ClientHomePage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13230769230769232 - nodes in this community are weakly interconnected._
