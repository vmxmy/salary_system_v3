import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { MainLayout } from '@/layouts/MainLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoadingScreen } from '@/components/common/LoadingScreen';

// Lazy load pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const EmployeeListPage = lazy(() => import('@/pages/employee/EmployeeListPage'));
const EmployeeDetailPage = lazy(() => import('@/pages/employee/EmployeeDetailPage'));
const DepartmentPage = lazy(() => import('@/pages/organization/DepartmentPage'));
const PositionPage = lazy(() => import('@/pages/organization/PositionPage'));
const PayrollPage = lazy(() => import('@/pages/payroll/PayrollPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));
const DebugPage = lazy(() => import('@/pages/DebugPage'));

// Route configuration
export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: 'register',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <RegisterPage />
          </Suspense>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ForgotPasswordPage />
          </Suspense>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ResetPasswordPage />
          </Suspense>
        ),
      },
      {
        index: true,
        element: <Navigate to="/auth/login" replace />,
      },
    ],
  },
  {
    path: '/debug',
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <DebugPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'employees',
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <EmployeeListPage />
              </Suspense>
            ),
          },
          {
            path: ':id',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <EmployeeDetailPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'organization',
        children: [
          {
            path: 'departments',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <DepartmentPage />
              </Suspense>
            ),
          },
          {
            path: 'positions',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <PositionPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'payroll',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <PayrollPage />
          </Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'unauthorized',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <UnauthorizedPage />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
]);