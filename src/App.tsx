import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Spinner } from '@/components/ui/spinner';

// 布局
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { AuthLayout } from '@/components/layouts/auth-layout';

// 懒加载页面组件
const LoginPage = lazy(() => import('@/app/(auth)/login/page'));
const RegisterPage = lazy(() => import('@/app/(auth)/register/page'));
const HomePage = lazy(() => import('@/app/(dashboard)/page'));
const DailyPage = lazy(() => import('@/app/(dashboard)/daily/page'));
const DailyDetailPage = lazy(() => import('@/app/(dashboard)/daily/[id]/page'));
const WeeklyPage = lazy(() => import('@/app/(dashboard)/weekly/page'));
const WeeklyDetailPage = lazy(() => import('@/app/(dashboard)/weekly/[id]/page'));
const NotesPage = lazy(() => import('@/app/(dashboard)/notes/page'));
const NoteDetailPage = lazy(() => import('@/app/(dashboard)/notes/[id]/page'));
const SettingsPage = lazy(() => import('@/app/(dashboard)/settings/page'));

// 加载中组件
function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner className="w-8 h-8" />
    </div>
  );
}

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// 公开路由（已登录用户重定向到首页）
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* 认证路由 */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
        </Route>

        {/* 仪表盘路由 */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/daily" element={<DailyPage />} />
          <Route path="/daily/:id" element={<DailyDetailPage />} />
          <Route path="/weekly" element={<WeeklyPage />} />
          <Route path="/weekly/:id" element={<WeeklyDetailPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:id" element={<NoteDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 404 重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
