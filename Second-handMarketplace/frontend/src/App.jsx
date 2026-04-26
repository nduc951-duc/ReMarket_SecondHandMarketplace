import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthOnlyRoute, ProtectedRoute, RootRedirect } from './components/auth/RouteGuards';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ClientHomePage from './pages/client/ClientHomePage';
import ProfilePage from './pages/client/ProfilePage';
import TransactionHistoryPage from './pages/client/TransactionHistoryPage';
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
        path="/app"
        element={
          <ProtectedRoute>
            <ClientHomePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
