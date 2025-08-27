import { useMemo } from 'react';
import { PayrollCompletenessStats } from '@/components/payroll/PayrollCompletenessStats';
import { PayrollElement } from '@/types/payroll-completeness';
import { cardEffects } from '@/styles/design-effects';
import { formatCurrency } from '@/lib/format';
import type { PayrollPeriodCompleteness } from '@/types/payroll-completeness';
import type { PayrollStatistics } from '@/hooks/payroll/usePayrollStatistics';

interface PayrollStatsSectionProps {
  statistics: PayrollStatistics | null | undefined;
  completenessData: PayrollPeriodCompleteness | null | undefined;
  statsLoading: boolean;
  completenessLoading: boolean;
  onElementClick?: (element: PayrollElement) => void;
}

const StatIcons = {
  users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  income: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  deduction: "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6",
  net: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  regular: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  contracted: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v6-6zM8 6v10.5a2.5 2.5 0 002.5 2.5h3A2.5 2.5 0 0016 16.5V6H8z"
};

export function PayrollStatsSection({
  statistics,
  completenessData,
  statsLoading,
  completenessLoading,
  onElementClick
}: PayrollStatsSectionProps) {
  const statCards = useMemo(() => [
    { 
      title: '总记录数', 
      value: statistics?.employeeCount?.toString() ?? '0', 
      icon: StatIcons.users,
      desc: (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="badge badge-success badge-sm">正编</span>
            <span className="text-base-content/80">{statistics?.byEmployeeType?.regular?.employeeCount ?? 0} 人</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-info badge-sm">聘用</span>
            <span className="text-base-content/80">{statistics?.byEmployeeType?.contracted?.employeeCount ?? 0} 人</span>
          </div>
        </div>
      )
    },
    { 
      title: '总应发金额', 
      value: formatCurrency(statistics?.totalGrossPay ?? 0), 
      icon: StatIcons.income,
      desc: (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="badge badge-success badge-sm">正编</span>
            <span className="text-base-content/80">{formatCurrency(statistics?.byEmployeeType?.regular?.totalGrossPay ?? 0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-info badge-sm">聘用</span>
            <span className="text-base-content/80">{formatCurrency(statistics?.byEmployeeType?.contracted?.totalGrossPay ?? 0)}</span>
          </div>
        </div>
      )
    },
    { 
      title: '总扣发金额', 
      value: formatCurrency(statistics?.totalDeductions ?? 0), 
      icon: StatIcons.deduction,
      desc: (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="badge badge-success badge-sm">正编</span>
            <span className="text-base-content/80">{formatCurrency(statistics?.byEmployeeType?.regular?.totalDeductions ?? 0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-info badge-sm">聘用</span>
            <span className="text-base-content/80">{formatCurrency(statistics?.byEmployeeType?.contracted?.totalDeductions ?? 0)}</span>
          </div>
        </div>
      )
    },
    { 
      title: '总实发金额', 
      value: formatCurrency(statistics?.totalNetPay ?? 0), 
      icon: StatIcons.net,
      desc: (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="badge badge-success badge-sm">正编</span>
            <span className="text-base-content/80">{formatCurrency(statistics?.byEmployeeType?.regular?.totalNetPay ?? 0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-info badge-sm">聘用</span>
            <span className="text-base-content/80">{formatCurrency(statistics?.byEmployeeType?.contracted?.totalNetPay ?? 0)}</span>
          </div>
        </div>
      )
    }
  ], [statistics]);


  return (
    <div className="space-y-6">
      {/* 薪资统计数据 */}
      <div className={`${cardEffects.standard} p-6`}>
        <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          薪资统计概览
        </h3>
        <div className="stats stats-vertical lg:stats-horizontal shadow-sm bg-base-200/30 w-full">
          {statCards.map((card, index) => (
            <div key={index} className="stat">
              <div className="stat-figure text-primary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                </svg>
              </div>
              <div className="stat-title">{card.title}</div>
              <div className="stat-value text-primary">
                {statsLoading ? <div className="loading loading-spinner loading-md"></div> : card.value}
              </div>
              <div className="stat-desc text-sm">
                {statsLoading ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="skeleton h-4 w-8 rounded-full"></div>
                      <div className="skeleton h-3 w-16"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="skeleton h-4 w-8 rounded-full"></div>
                      <div className="skeleton h-3 w-12"></div>
                    </div>
                  </div>
                ) : (
                  card.desc
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      <div className={`${cardEffects.standard} p-6`} data-tour="payroll-completeness">
        <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={StatIcons.check} />
          </svg>
          四要素完整度
        </h3>
        <PayrollCompletenessStats completeness={completenessData || null} className="w-full" onElementClick={onElementClick} />
      </div>
    </div>
  );
}