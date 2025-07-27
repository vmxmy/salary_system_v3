import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }> | LucideIcon;
  iconClassName?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  iconClassName,
  actions,
  className
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center',
              'bg-base-200 text-primary',
              iconClassName
            )}>
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-base-content mb-1">
              {title}
            </h1>
            {description && (
              <p className="text-base text-base-content/70">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface PageContentProps {
  children: ReactNode;
  className?: string;
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
}