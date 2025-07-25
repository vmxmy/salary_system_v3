import { useTranslation } from '@/hooks/useTranslation';

export function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-100">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
        <p className="text-base-content/60">{t('common.loading')}</p>
      </div>
    </div>
  );
}