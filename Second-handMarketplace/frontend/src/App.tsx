import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import {
  AdminRoute,
  AgentRoute,
  AuthOnlyRoute,
  ProtectedRoute,
  RootRedirect,
} from './components/auth/RouteGuards';
import { useAuthStore } from './store/authStore';

const AiSupportWidget = lazy(() => import('./components/ai/AiSupportWidget'));
const AgentInboxPage = lazy(() => import('./pages/agent/AgentInboxPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const ModerationPage = lazy(() => import('./pages/admin/ModerationPage'));
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const ChatPage = lazy(() => import('./pages/client/ChatPage'));
const ClientHomePage = lazy(() => import('./pages/client/ClientHomePage'));
const MyProductsPage = lazy(() => import('./pages/client/MyProductsPage'));
const NotificationsPage = lazy(() => import('./pages/client/NotificationsPage'));
const ProductDetailPage = lazy(() => import('./pages/client/ProductDetailPage'));
const ProductFormPage = lazy(() => import('./pages/client/ProductFormPage'));
const ProfilePage = lazy(() => import('./pages/client/ProfilePage'));
const SearchResultsPage = lazy(() => import('./pages/client/SearchResultsPage'));
const SellerDashboard = lazy(() => import('./pages/client/SellerDashboard'));
const SupportChatPage = lazy(() => import('./pages/client/SupportChatPage'));
const TransactionHistoryPage = lazy(() => import('./pages/client/TransactionHistoryPage'));
const WishlistPage = lazy(() => import('./pages/client/WishlistPage'));
const ForbiddenPage = lazy(() => import('./pages/system/ForbiddenPage'));
const NotFoundPage = lazy(() => import('./pages/system/NotFoundPage'));
const ServerErrorPage = lazy(() => import('./pages/system/ServerErrorPage'));

function RouteLoadingScreen() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-background px-6 text-foreground"
      aria-busy="true"
    >
      <div
        className="flex items-center gap-3 text-sm font-medium text-muted-foreground"
        role="status"
      >
        <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
        Đang tải nội dung…
      </div>
    </main>
  );
}

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <Suspense fallback={<RouteLoadingScreen />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/login"
            element={
              <AuthOnlyRoute>
                <LoginPage />
              </AuthOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <AuthOnlyRoute>
                <RegisterPage />
              </AuthOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <AuthOnlyRoute>
                <ForgotPasswordPage />
              </AuthOnlyRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <TransactionHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/new"
            element={
              <ProtectedRoute>
                <ProductFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id/edit"
            element={
              <ProtectedRoute>
                <ProductFormPage />
              </ProtectedRoute>
            }
          />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route
            path="/seller/dashboard"
            element={
              <ProtectedRoute>
                <SellerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support-chat"
            element={
              <ProtectedRoute>
                <SupportChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="/agent/inbox"
            element={
              <AgentRoute>
                <AgentInboxPage />
              </AgentRoute>
            }
          />
          <Route
            path="/moderation"
            element={
              <AgentRoute>
                <ModerationPage />
              </AgentRoute>
            }
          />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/500" element={<ServerErrorPage />} />
          <Route
            path="/my-products"
            element={
              <ProtectedRoute>
                <MyProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <ClientHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchResultsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        <AiSupportWidget />
      </Suspense>
    </>
  );
}

export default App;
