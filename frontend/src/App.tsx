import { RouterProvider } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './locales';
import { router } from './router';
import { AuthProvider } from './contexts/AuthContext';
import { DevAuthProvider } from './contexts/DevAuthContext';
import { ToastProvider } from './contexts/ToastContext';

function App() {
  const isDevelopment = import.meta.env.DEV;
  const ActiveAuthProvider = isDevelopment ? DevAuthProvider : AuthProvider;

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