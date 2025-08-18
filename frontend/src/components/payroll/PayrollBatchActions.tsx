import { cn, cardEffects, buttonEffects } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface PayrollBatchActionsProps {
  selectedCount: number;
  onApprove?: () => void;
  onMarkPaid?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  loading?: boolean;
  className?: string;
}

export function PayrollBatchActions({
  selectedCount,
  onApprove,
  onMarkPaid,
  onCancel,
  onDelete,
  onExport,
  loading = false,
  className
}: PayrollBatchActionsProps) {
  const { t } = useTranslation('payroll');

  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      cardEffects.modern,
      'p-4 flex items-center justify-between gap-4',
      'animate-in slide-in-from-top-2 duration-300',
      className
    )}>
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
          <span className="text-sm font-semibold">{selectedCount}</span>
        </div>
        <span className="text-sm text-base-content/70">
          {String(t('selectedItems', { count: selectedCount }))}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onApprove && (
          <button
            onClick={onApprove}
            disabled={loading}
            className={cn(
              buttonEffects.secondary,
              'btn btn-sm gap-2 text-success border-success/20'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {String(t('approve'))}
          </button>
        )}

        {onMarkPaid && (
          <button
            onClick={onMarkPaid}
            disabled={loading}
            className={cn(
              buttonEffects.primary,
              'btn btn-sm gap-2'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {String(t('markPaid'))}
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            disabled={loading}
            className={cn(
              buttonEffects.ghost,
              'btn btn-sm gap-2'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {String(t('exportAction'))}
          </button>
        )}

        <div className="w-px h-6 bg-base-200 mx-2" />

        {onCancel && (
          <button
            onClick={onCancel}
            disabled={loading}
            className={cn(
              buttonEffects.ghost,
              'btn btn-sm gap-2 text-warning'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            {String(t('cancel'))}
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            disabled={loading}
            className={cn(
              buttonEffects.ghost,
              'btn btn-sm gap-2 text-error'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {String(t('delete'))}
          </button>
        )}
      </div>
    </div>
  );
}