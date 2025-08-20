import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface BatchAction {
  key: string;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  variant?: 'success' | 'info' | 'warning' | 'error' | 'outline' | 'ghost';
  disabled?: boolean;
  title?: string;
}

interface PayrollBatchActionsProps {
  selectedCount: number;
  actions?: BatchAction[];
  onClearSelection?: () => void;
  loading?: boolean;
  className?: string;
  // 保持向后兼容的属性
  onCancel?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onCalculateInsurance?: () => void;
  onCalculatePayroll?: () => void;
  onCalculateAll?: () => void;
}

export function PayrollBatchActions({
  selectedCount,
  actions,
  onClearSelection,
  loading = false,
  className,
  // Legacy props for backward compatibility
  onCancel,
  onDelete,
  onExport,
  onCalculateInsurance,
  onCalculatePayroll,
  onCalculateAll
}: PayrollBatchActionsProps) {
  const { t } = useTranslation('payroll');

  if (selectedCount === 0) return null;

  // Helper function to get button variant class
  const getButtonClass = (variant?: BatchAction['variant']) => {
    switch (variant) {
      case 'success': return 'btn btn-success btn-sm gap-2';
      case 'info': return 'btn btn-info btn-sm gap-2';
      case 'warning': return 'btn btn-warning btn-sm gap-2';
      case 'error': return 'btn btn-error btn-sm gap-2';
      case 'outline': return 'btn btn-outline btn-sm gap-2';
      case 'ghost': return 'btn btn-ghost btn-sm gap-2';
      default: return 'btn btn-primary btn-sm gap-2';
    }
  };

  // Legacy compatibility - create actions from legacy props if no actions provided
  const legacyActions: BatchAction[] = [];
  
  if (!actions) {
    if (onCalculateInsurance) {
      legacyActions.push({
        key: 'calculate-insurance',
        label: '重算五险一金',
        onClick: onCalculateInsurance,
        variant: 'outline',
        title: '批量重算五险一金',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 002 2z" />
          </svg>
        )
      });
    }

    if (onCalculatePayroll) {
      legacyActions.push({
        key: 'calculate-payroll',
        label: '重算薪资汇总',
        onClick: onCalculatePayroll,
        variant: 'outline',
        title: '批量重算薪资汇总',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
          </svg>
        )
      });
    }

    if (onCalculateAll) {
      legacyActions.push({
        key: 'calculate-all',
        label: '重算全部',
        onClick: onCalculateAll,
        variant: 'outline',
        title: '重算全部（五险一金+薪资汇总）',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      });
    }

    if (onExport) {
      legacyActions.push({
        key: 'export',
        label: '导出',
        onClick: onExport,
        variant: 'outline',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )
      });
    }

    if (onCancel) {
      legacyActions.push({
        key: 'cancel',
        label: '取消',
        onClick: onCancel,
        variant: 'warning',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 715.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        )
      });
    }

    if (onDelete) {
      legacyActions.push({
        key: 'delete',
        label: '删除',
        onClick: onDelete,
        variant: 'error',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )
      });
    }
  }

  const finalActions = actions || legacyActions;

  return (
    <div className={cn(
      'card bg-base-100 shadow-sm border border-base-200',
      'p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4',
      'animate-in slide-in-from-top-2 duration-300',
      className
    )}>
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium text-primary">
          已选择 <span className="font-bold text-lg">{selectedCount}</span> 条记录
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {finalActions.map((action) => (
          <button
            key={action.key}
            onClick={action.onClick}
            disabled={loading || action.disabled}
            className={getButtonClass(action.variant)}
            title={action.title}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
        
        {finalActions.length > 0 && onClearSelection && (
          <>
            <div className="divider divider-horizontal mx-1"></div>
            <button
              className="btn btn-ghost btn-sm text-base-content/60"
              onClick={onClearSelection}
              title="清除选择"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
              清除
            </button>
          </>
        )}
      </div>
    </div>
  );
}