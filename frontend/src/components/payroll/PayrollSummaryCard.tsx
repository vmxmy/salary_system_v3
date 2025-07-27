import { cn } from '@/lib/utils';
import { PayrollAmountDisplay } from './PayrollAmountDisplay';
import { PayrollStatusBadge } from './PayrollStatusBadge';
import type { PayrollStatusType } from '@/services/payroll.service';
import { formatDate, formatMonth } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';

interface PayrollSummaryCardProps {
  payroll: {
    id: string;
    employee?: {
      full_name: string;
      id_number: string;
    };
    pay_period_start: string;
    pay_period_end: string;
    pay_date: string;
    status: PayrollStatusType;
    gross_pay: number;
    total_deductions: number;
    net_pay: number;
  };
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function PayrollSummaryCard({
  payroll,
  onClick,
  selected = false,
  className
}: PayrollSummaryCardProps) {
  const { t } = useTranslation('payroll');

  return (
    <div
      className={cn(
        'card bg-base-100 shadow-md hover:shadow-lg',
        'cursor-pointer p-6 transition-all duration-300',
        'hover:scale-[1.01]',
        selected && [
          'ring-2 ring-primary/30 bg-gradient-to-br from-primary/5 to-transparent'
        ],
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-base-content truncate">
            {payroll.employee?.full_name || t('unknown')}
          </h3>
          <p className="text-sm text-base-content/60">
            {payroll.employee?.id_number || '-'}
          </p>
        </div>
        <PayrollStatusBadge status={payroll.status} size="sm" />
      </div>

      {/* Pay Period */}
      <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-base-200/30 to-base-200/10">
        <div className="flex items-center gap-2 text-sm text-base-content/70">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{t('payPeriod')}: </span>
          <span className="font-medium text-base-content">
            {formatMonth(payroll.pay_period_start.substring(0, 7))}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-base-content/70 mt-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>{t('payDate')}: </span>
          <span className="font-medium text-base-content">
            {formatDate(payroll.pay_date)}
          </span>
        </div>
      </div>

      {/* Amount Summary */}
      <div className="grid grid-cols-3 gap-4">
        <PayrollAmountDisplay
          label={t('grossPay')}
          amount={payroll.gross_pay}
          type="earning"
          size="sm"
          showIcon={false}
        />
        <PayrollAmountDisplay
          label={t('deductions')}
          amount={payroll.total_deductions}
          type="deduction"
          size="sm"
          showIcon={false}
        />
        <PayrollAmountDisplay
          label={t('netPay')}
          amount={payroll.net_pay}
          type="net"
          size="sm"
          showIcon={false}
        />
      </div>
    </div>
  );
}