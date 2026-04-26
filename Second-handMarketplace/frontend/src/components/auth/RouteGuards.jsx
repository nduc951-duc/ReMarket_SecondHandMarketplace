import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

function AuthLoadingScreen() {
  return (
    <main className="auth-status-screen">
      <p>Đang kiểm tra phiên đăng nhập...</p>
    </main>
  );
}

export function RootRedirect() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return <Navigate to={user ? '/app' : '/login'} replace />;
}

export function AuthOnlyRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return children;
}

export function ProtectedRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
