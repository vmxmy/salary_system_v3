import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  variant?: 'page' | 'modal' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingScreen({ 
  message, 
  variant = 'page',
  size = 'lg' 
}: LoadingScreenProps = {}) {
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'loading-sm',
    md: 'loading-md', 
    lg: 'loading-lg'
  };

  const containerClasses = {
    page: cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      'bg-base-100/95 backdrop-blur-sm'
    ),
    modal: cn(
      'flex items-center justify-center py-12'
    ),
    inline: cn(
      'flex items-center justify-center py-8'
    )
  };

  if (variant === 'inline') {
    return (
      <div className={containerClasses[variant]}>
        <div className="flex items-center gap-3">
          <span className={cn('loading loading-spinner', sizeClasses[size])}></span>
          <span className="text-base-content/70">
{message || String(t('common:loading'))}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses[variant]}>
      <div className="text-center space-y-4">
        <span className={cn('loading loading-spinner text-primary', sizeClasses[size])}></span>
        <div className="max-w-sm mx-auto">
          <p className="text-base-content">
{message || String(t('common:loading'))}
          </p>
        </div>
      </div>
    </div>
  );
}