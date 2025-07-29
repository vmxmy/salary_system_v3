import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';

export function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10">
      <div className="flex min-h-screen">
        {/* Left side - Auth Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>

        {/* Right side - Branding */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary to-secondary items-center justify-center p-8">
          <div className="text-white text-center">
            <h1 className="text-4xl font-serif mb-4">
              {t('app.name')}
            </h1>
            <p className="text-xl opacity-90">
              {t('app.tagline', '专业的人事薪资管理解决方案')}
            </p>
          </div>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
    </div>
  );
}