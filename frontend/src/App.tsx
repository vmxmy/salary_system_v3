import { RouterProvider } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './locales';
import { router } from './router';
import { UnifiedAuthProvider } from './contexts/UnifiedAuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { SessionMonitor } from './components/auth/SessionMonitor';

// 在开发环境下导入测试工具
if (import.meta.env.DEV) {
  import('./utils/reauth-test');
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <UnifiedAuthProvider>
          <OnboardingProvider>
            <RouterProvider router={router} />
          </OnboardingProvider>
        </UnifiedAuthProvider>
      </ToastProvider>
    </I18nextProvider>
  );
}

export default App;