import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  description, 
  actions,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
      className
    )}>
      <div className="flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm sm:text-base text-text-secondary">
            {description}
          </p>
        )}
      </div>
      
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}