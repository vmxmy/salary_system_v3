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
const AuthCallbackPage = lazy(() => import('@/pages/auth/AuthCallbackPage'));

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const EmployeeListPage = lazy(() => import('@/pages/employee/EmployeeManagementPage'));
const EmployeeDetailPage = lazy(() => import('@/pages/employee/EmployeeDetailPage'));
const DepartmentPage = lazy(() => import('@/pages/department/DepartmentManagementPage'));
const DepartmentPayrollStatsPage = lazy(() => import('@/pages/department/DepartmentPayrollStatsPage'));
const PositionPage = lazy(() => import('@/pages/organization/PositionPage'));
const PayrollListPage = lazy(() => import('@/pages/payroll/PayrollListPage'));
const PayrollImportPage = lazy(() => import('@/pages/payroll/PayrollImportPage'));
const PayrollDetailPage = lazy(() => import('@/pages/payroll/PayrollDetailPage'));
// Removed CreateBatchPayrollPage and PayrollCycleWizardPage - moved to archive
const PayrollApprovalPage = lazy(() => import('@/pages/payroll/PayrollApprovalPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const NetworkSettingsPage = lazy(() => import('@/pages/settings/NetworkSettingsPage'));
const StatisticsPage = lazy(() => import('@/pages/statistics/StatisticsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));
const PayrollImportPageV2 = lazy(() => import('@/components/payroll/import/PayrollImportPageV2'));
const InsuranceConfigPage = lazy(() => import('@/pages/payroll/InsuranceConfigPage'));

// Report management page
const ReportManagementPageReal = lazy(() => import('@/components/reports/ReportManagementPageReal'));

// Admin pages
const UserManagementPage = lazy(() => import('@/pages/admin/UserManagementPage'));
const RoleManagementPage = lazy(() => import('@/pages/admin/RoleManagementPage'));
const PermissionManagementPage = lazy(() => import('@/pages/admin/PermissionManagementPage'));
const SystemSettingsPage = lazy(() => import('@/pages/admin/SystemSettingsPage'));
const SalaryComponentManagementPage = lazy(() => import('@/pages/admin/SalaryComponentManagementPage'));
// Permission pages moved to archive
// const PermissionResourceManagementPage = lazy(() => import('@/pages/admin/PermissionResourceManagementPage'));
// const PermissionAssignmentPage = lazy(() => import('@/pages/admin/PermissionAssignmentPage'));
// const PermissionApprovalPage = lazy(() => import('@/pages/admin/PermissionApprovalPage'));
// const PermissionRequestPage = lazy(() => import('@/pages/permissions/PermissionRequestPage'));
// const MyPermissionsPage = lazy(() => import('@/pages/permissions/MyPermissionsPage'));

// Test pages moved to archive
// const HookTestPage = lazy(() => import('@/pages/test/AuthenticatedHookTestPage'));
// const EmployeeCreateTestPage = lazy(() => import('@/pages/EmployeeCreateTestPage'));

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
        path: 'callback',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <AuthCallbackPage />
          </Suspense>
        ),
      },
      {
        index: true,
        element: <Navigate to="/auth/login" replace />,
      },
    ],
  },
  // {
  //   path: '/test/payroll-hooks',
  //   element: (
  //     <Suspense fallback={<LoadingScreen />}>
  //       <PayrollHookTestPage />
  //     </Suspense>
  //   ),
  // }, // 已删除
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
            path: 'departments/payroll-stats',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <DepartmentPayrollStatsPage />
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
        children: [
          {
            index: true,
            element: <Navigate to="/payroll/list" replace />,
          },
          {
            path: 'list',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <PayrollListPage />
              </Suspense>
            ),
          },
          {
            path: 'import',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <PayrollImportPageV2 />
              </Suspense>
            ),
          },
          {
            path: 'approval',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <PayrollApprovalPage />
              </Suspense>
            ),
          },
          {
            path: 'insurance-config',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <InsuranceConfigPage />
              </Suspense>
            ),
          },
          {
            path: 'reports',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <ReportManagementPageReal />
              </Suspense>
            ),
          },
          {
            path: ':id',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <PayrollDetailPage />
              </Suspense>
            ),
          },
        ],
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
            <NetworkSettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'statistics',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute requiredPermissions={['statistics.view']}>
              <StatisticsPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      // Admin management pages
      {
        path: 'admin',
        children: [
          {
            path: 'users',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <ProtectedRoute requiredPermissions={['user_management.read']}>
                  <UserManagementPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'roles',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <ProtectedRoute requiredPermissions={['manage_roles']}>
                  <RoleManagementPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'permissions',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <ProtectedRoute requiredPermissions={['permission_management.read', 'manage_role_permissions']}>
                  <PermissionManagementPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
          {
            path: 'system-settings',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <SystemSettingsPage />
              </Suspense>
            ),
          },
          {
            path: 'salary-components',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <ProtectedRoute requiredPermissions={['user_management.read']}>
                  <SalaryComponentManagementPage />
                </ProtectedRoute>
              </Suspense>
            ),
          },
        ],
      },
      // Test routes moved to archive
      // {
      //   path: 'hook-test',
      //   element: (
      //     <Suspense fallback={<LoadingScreen />}>
      //       <HookTestPage />
      //     </Suspense>
      //   ),
      // },
      // {
      //   path: 'employee-create-test',
      //   element: (
      //     <Suspense fallback={<LoadingScreen />}>
      //       <EmployeeCreateTestPage />
      //     </Suspense>
      //   ),
      // },
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