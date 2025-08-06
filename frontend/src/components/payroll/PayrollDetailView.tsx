import { cn, cardEffects, iconContainer } from '@/lib/utils';
import { PayrollStatusBadge } from './PayrollStatusBadge';
import { PayrollAmountDisplay } from './PayrollAmountDisplay';
import { formatCurrency, formatDate, formatMonth } from '@/lib/format';
import { useTranslation } from '@/hooks/useTranslation';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import type { PayrollStatusType } from '@/services/payroll.service';

interface PayrollDetailItem {
  id: string;
  component_name: string;
  category_name: string;
  category_sort_order: number;
  amount: number;
  is_earning: boolean;
}

interface PayrollDetailViewProps {
  payroll: {
    id: string;
    employee?: {
      full_name: string;
      id_number: string | null;
    };
    pay_period_start: string;
    pay_period_end: string;
    pay_date: string;
    status: PayrollStatusType;
    gross_pay: number;
    total_deductions: number;
    net_pay: number;
    notes?: string;
  };
  details?: PayrollDetailItem[];
  loading?: boolean;
  className?: string;
}

export function PayrollDetailView({
  payroll,
  details = [],
  loading = false,
  className
}: PayrollDetailViewProps) {
  const { t } = useTranslation('payroll');

  // 按分类组织明细项
  const groupedDetails = details.reduce((acc, item) => {
    const category = item.category_name;
    if (!acc[category]) {
      acc[category] = {
        sortOrder: item.category_sort_order,
        items: []
      };
    }
    acc[category].items.push(item);
    return acc;
  }, {} as Record<string, { sortOrder: number; items: PayrollDetailItem[] }>);

  // 按排序顺序获取分类
  const sortedCategories = Object.entries(groupedDetails)
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder);

  // 计算分类小计
  const calculateCategoryTotal = (items: PayrollDetailItem[]) => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Card */}
      <div className={cardEffects.modern}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-base-content">
                {t('payrollDetails')}
              </h2>
              <p className="text-base-content/60 mt-1">
                {payroll.employee?.full_name} ({payroll.employee?.id_number})
              </p>
            </div>
            <PayrollStatusBadge status={payroll.status} size="lg" showIcon={false} />
          </div>

          {/* Pay Period Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-gradient-to-r from-base-200/20 to-base-200/10">
            <div className="flex items-center gap-3">
              <div className={iconContainer.modern('primary', 'sm')}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-base-content/60">{t('payPeriod')}</p>
                <p className="font-medium">
                  {formatMonth(payroll.pay_period_start.substring(0, 7))}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={iconContainer.modern('success', 'sm')}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-base-content/60">{t('payroll:payDate')}</p>
                <p className="font-medium">{formatDate(payroll.pay_date)}</p>
              </div>
            </div>
          </div>

          {/* Summary Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <PayrollAmountDisplay
              label={t('grossPay')}
              amount={payroll.gross_pay}
              type="earning"
              size="lg"
            />
            <PayrollAmountDisplay
              label={t('totalDeductions')}
              amount={payroll.total_deductions}
              type="deduction"
              size="lg"
            />
            <PayrollAmountDisplay
              label={t('netPay')}
              amount={payroll.net_pay}
              type="net"
              size="lg"
            />
          </div>
        </div>
      </div>

      {/* Detail Items */}
      {loading ? (
        <LoadingScreen />
      ) : (
        <div className={cardEffects.modern}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-base-content mb-4">
              {t('payrollBreakdown')}
            </h3>

            <div className="space-y-6">
              {sortedCategories.map(([category, data]) => (
                <div key={category} className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-base-200/30 to-base-200/10">
                    <h4 className="font-medium text-base-content">
                      {category}
                    </h4>
                    <span className={cn(
                      'font-semibold tabular-nums',
                      data.items[0]?.is_earning ? 'text-success' : 'text-error'
                    )}>
                      {!data.items[0]?.is_earning && '-'}
                      {formatCurrency(Math.abs(calculateCategoryTotal(data.items)))}
                    </span>
                  </div>

                  {/* Category Items */}
                  <div className="space-y-2 pl-4">
                    {data.items.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-base-100/50 transition-colors"
                      >
                        <span className="text-sm text-base-content/80">
                          {item.component_name}
                        </span>
                        <span className={cn(
                          'text-sm font-medium tabular-nums',
                          item.is_earning ? 'text-success' : 'text-error'
                        )}>
                          {!item.is_earning && '-'}
                          {formatCurrency(Math.abs(item.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            {payroll.notes && (
              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-info/10 to-info/5 border border-info/20">
                <div className="flex items-start gap-3">
                  <div className={iconContainer.modern('info', 'sm')}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-info mb-1">{t('notes')}</h5>
                    <p className="text-sm text-base-content/70">{payroll.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}