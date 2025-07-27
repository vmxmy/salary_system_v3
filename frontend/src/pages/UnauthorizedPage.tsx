import { Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

export default function UnauthorizedPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-warning">403</h1>
        <p className="text-2xl font-serif mb-4">{t('permission.denied')}</p>
        <p className="text-base-content/60 mb-8">
          {t('permission.deniedMessage')}
        </p>
        <Link to="/dashboard" className="btn btn-primary">
          {t('back')} {t('nav.dashboard')}
        </Link>
      </div>
    </div>
  );
}