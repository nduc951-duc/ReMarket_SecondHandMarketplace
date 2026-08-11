import { Loader2 } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { isAdminUser, isAgentUser } from '@/utils/adminAccess';
import { useAuthStore } from '@/store/authStore';

function AuthLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <Loader2 className="size-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang kiểm tra phiên đăng nhập…</p>
      </div>
    </main>
  );
}

export function RootRedirect() {
  return <Navigate to="/app" replace />;
}

export function AuthOnlyRoute({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.isLoading);
  if (loading) return <AuthLoadingScreen />;
  return user ? <Navigate to="/app" replace /> : children;
}

export function ProtectedRoute({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.isLoading);
  const location = useLocation();
  if (loading) return <AuthLoadingScreen />;
  return user ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

export function AdminRoute({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.isLoading);
  const location = useLocation();
  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return isAdminUser(user) ? children : <Navigate to="/403" replace />;
}

export function AgentRoute({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.isLoading);
  const location = useLocation();
  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return isAdminUser(user) || isAgentUser(user) ? children : <Navigate to="/403" replace />;
}
