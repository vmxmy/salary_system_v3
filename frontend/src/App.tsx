import { RouterProvider } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './locales';
import { router } from './router';
import { AuthProvider } from './contexts/AuthContext';
import { DevAuthProvider } from './contexts/DevAuthContext';
import { ToastProvider } from './contexts/ToastContext';

function App() {
  // 强制使用真实的 Supabase 认证，而不是开发模式的模拟认证
  // const isDevelopment = import.meta.env.DEV;
  // const ActiveAuthProvider = isDevelopment ? DevAuthProvider : AuthProvider;
  const ActiveAuthProvider = AuthProvider; // 始终使用 Supabase 认证

  return (
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <ActiveAuthProvider>
          <RouterProvider router={router} />
        </ActiveAuthProvider>
      </ToastProvider>
    </I18nextProvider>
  );
}

export default App;