import { Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary">404</h1>
        <p className="text-2xl font-serif mb-4">Page Not Found</p>
        <p className="text-base-content/60 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}