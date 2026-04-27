import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import {
  AdminRoute,
  AuthOnlyRoute,
  ProtectedRoute,
  RootRedirect,
} from './components/auth/RouteGuards';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ChatPage from './pages/client/ChatPage';
import ClientHomePage from './pages/client/ClientHomePage';
import MyProductsPage from './pages/client/MyProductsPage';
import NotificationsPage from './pages/client/NotificationsPage';
import ProductDetailPage from './pages/client/ProductDetailPage';
import ProductFormPage from './pages/client/ProductFormPage';
import ProfilePage from './pages/client/ProfilePage';
import SellerDashboard from './pages/client/SellerDashboard';
import TransactionHistoryPage from './pages/client/TransactionHistoryPage';
import WishlistPage from './pages/client/WishlistPage';
import NotFoundPage from './pages/system/NotFoundPage';
import ServerErrorPage from './pages/system/ServerErrorPage';
import { useAuthStore } from './store/authStore';

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
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
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
