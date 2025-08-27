import { useState } from 'react';

export type ViewType = 'list' | 'detail';

interface PayrollViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  className?: string;
}

export function PayrollViewSwitcher({ 
  currentView, 
  onViewChange, 
  className = '' 
}: PayrollViewSwitcherProps) {
  return (
    <div className={`join ${className}`}>
      <button
        className={`join-item btn btn-sm ${
          currentView === 'list' ? 'btn-primary' : 'btn-outline'
        }`}
        onClick={() => onViewChange('list')}
        type="button"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        列表视图
      </button>
      <button
        className={`join-item btn btn-sm ${
          currentView === 'detail' ? 'btn-primary' : 'btn-outline'
        }`}
        onClick={() => onViewChange('detail')}
        type="button"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        详情视图
      </button>
    </div>
  );
}