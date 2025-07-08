import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmployeeListPage from './pages/employee/EmployeeListPage';
import EmployeeDetailPage from './pages/employee/EmployeeDetailPage';
import EmployeeEditPage from './pages/employee/EmployeeEditPage';
import EmployeeCreatePage from './pages/employee/EmployeeCreatePage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/employees" element={<EmployeeListPage />} />
          <Route path="/employees/create" element={<EmployeeCreatePage />} />
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
          <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />
          {/* 其他受保护的路由将在后续添加 */}
        </Route>
      </Route>
    </Routes>
  );
}

export default App;