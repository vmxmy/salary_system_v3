import React from 'react';
import { cn } from '@/lib/utils';

export interface PageToolbarProps {
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  customContent?: React.ReactNode;
  searchComponent?: React.ReactNode;
  fieldSelector?: React.ReactNode;
  exportComponent?: React.ReactNode;
  extraActions?: React.ReactNode[];
  className?: string;
}

export function PageToolbar({
  title,
  subtitle,
  headerActions,
  customContent,
  searchComponent,
  fieldSelector,
  exportComponent,
  extraActions,
  className
}: PageToolbarProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Page Header */}
      {(title || subtitle || headerActions) && (
        <header className="flex items-start justify-between">
          <div>
            {title && (
              <h1 className="text-3xl font-bold text-base-content">{title}</h1>
            )}
            {subtitle && (
              <p className="text-base-content/70 mt-2">{subtitle}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-4">
              {headerActions}
            </div>
          )}
        </header>
      )}

      {/* Custom Content */}
      {customContent && (
        <div>{customContent}</div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Left side - Search */}
        <div className="flex-1 w-full lg:w-auto">
          {searchComponent}
        </div>
        
        {/* Right side - Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Field Selector */}
          {fieldSelector}
          
          {/* Extra Actions */}
          {extraActions?.map((action, index) => (
            <div key={index} className="shrink-0">
              {action}
            </div>
          ))}
          
          {/* Export Component */}
          {exportComponent}
        </div>
      </div>
    </div>
  );
}