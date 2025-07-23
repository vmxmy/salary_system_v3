import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmployeeListPage from './pages/employee/EmployeeListPage';
import EmployeeDetailPage from './pages/employee/EmployeeDetailPage';
import EmployeeDetailPageNew from './pages/employee/EmployeeDetailPage_new';
import EmployeeEditPage from './pages/employee/EmployeeEditPage';
import EmployeeCreatePage from './pages/employee/EmployeeCreatePage';
import EmployeeCreatePageNew from './pages/employee/EmployeeCreatePage_new';
import EmployeeEditPageNew from './pages/employee/EmployeeEditPage_new';
import InsuranceConfigPage from './pages/payroll/InsuranceConfigPage';
import TaxConfigPage from './pages/payroll/TaxConfigPage';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/ToastProvider';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/employees" element={<EmployeeListPage />} />
            <Route path="/employees/create" element={<EmployeeCreatePage />} />
            <Route path="/employees/create-new" element={<EmployeeCreatePageNew />} />
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="/employees/:id/detail-new" element={<EmployeeDetailPageNew />} />
            <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />
            <Route path="/employees/:id/edit-new" element={<EmployeeEditPageNew />} />
            <Route path="/payroll/insurance-config" element={<InsuranceConfigPage />} />
            <Route path="/payroll/tax-config" element={<TaxConfigPage />} />
            {/* 其他受保护的路由将在后续添加 */}
          </Route>
        </Route>
      </Routes>
    </ToastProvider>
  );
}

export default App;