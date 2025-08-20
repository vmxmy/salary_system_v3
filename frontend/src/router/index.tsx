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
const EmployeeListPage = lazy(() => import('@/pages/employee/EmployeeListPage'));
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
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const ThemeShowcasePage = lazy(() => import('@/pages/ThemeShowcasePage'));
const DesignTokensPage = lazy(() => import('@/pages/DesignTokensPage'));
const DesignSystemShowcase = lazy(() => import('@/pages/DesignSystemShowcase'));
const TypographyShowcasePage = lazy(() => import('@/pages/TypographyShowcasePage'));
const FontTestPage = lazy(() => import('@/pages/FontTestPage'));
const MonthPickerDemoPage = lazy(() => import('@/pages/MonthPickerDemoPage'));
const ValidationTestPage = lazy(() => import('@/pages/ValidationTestPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));
const DebugPage = lazy(() => import('@/pages/DebugPage'));
// const PayrollHookTestPage = lazy(() => import('@/pages/PayrollHooksTestPage')); // 已删除
const NewTableArchitectureTestPage = lazy(() => import('@/pages/test/NewTableArchitectureTestPage'));
const TestMetadata = lazy(() => import('@/pages/test/TestMetadata'));
const InsuranceCalculationTest = lazy(() => import('@/pages/test/InsuranceCalculationTest'));
const InsuranceConfigTest = lazy(() => import('@/pages/test/InsuranceConfigTest'));
const PayrollCalculationTest = lazy(() => import('@/pages/test/PayrollCalculationTest'));
const InsuranceConfigPage = lazy(() => import('@/pages/payroll/InsuranceConfigPage'));
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
  {
    path: '/debug',
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <DebugPage />
      </Suspense>
    ),
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
    path: '/test/new-table-architecture',
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <NewTableArchitectureTestPage />
      </Suspense>
    ),
  },
  {
    path: '/test/metadata',
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <TestMetadata />
      </Suspense>
    ),
  },
  {
    path: '/test/insurance-calculation',
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <InsuranceCalculationTest />
      </Suspense>
    ),
  },
  {
    path: '/test/insurance-config',
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <InsuranceConfigTest />
      </Suspense>
    ),
  },
  {
    path: '/test/payroll-calculation',
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <PayrollCalculationTest />
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
                <PayrollImportPage />
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
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'theme-showcase',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ThemeShowcasePage />
          </Suspense>
        ),
      },
      {
        path: 'design-tokens',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <DesignTokensPage />
          </Suspense>
        ),
      },
      {
        path: 'design-system',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <DesignSystemShowcase />
          </Suspense>
        ),
      },
      {
        path: 'typography',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <TypographyShowcasePage />
          </Suspense>
        ),
      },
      {
        path: 'font-test',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <FontTestPage />
          </Suspense>
        ),
      },
      {
        path: 'validation-test',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ValidationTestPage />
          </Suspense>
        ),
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