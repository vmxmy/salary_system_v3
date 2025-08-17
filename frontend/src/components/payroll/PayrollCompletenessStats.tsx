import { cn } from '@/lib/utils';
import type { PayrollPeriodCompleteness } from '@/types/payroll-completeness';
import { 
  PAYROLL_ELEMENTS_CONFIG,
  PayrollElement 
} from '@/types/payroll-completeness';

interface PayrollCompletenessStatsProps {
  completeness: PayrollPeriodCompleteness | null;
  className?: string;
  onClick?: () => void;
}

/**
 * 四要素完整度统计组 - 将四个要素作为一个整体组件显示
 * 适合作为统计卡片的一部分展示
 */
export function PayrollCompletenessStats({
  completeness,
  className,
  onClick
}: PayrollCompletenessStatsProps) {
  if (!completeness) {
    return (
      <div className={cn("stats shadow w-full", className)}>
        <div className="stat">
          <div className="stat-title">四要素完整度</div>
          <div className="stat-value">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
          <div className="stat-desc">数据加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "stats shadow w-full",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      {/* 薪资项目 */}
      <div className="stat">
        <div className="stat-figure text-primary">
          <div className={cn(
            "radial-progress",
            completeness.earnings_status === 'complete' && "text-success",
            completeness.earnings_status === 'partial' && "text-warning",
            completeness.earnings_status === 'empty' && "text-error"
          )} 
          style={{ "--value": completeness.earnings_percentage, "--size": "3rem" } as React.CSSProperties}>
            <span className="text-lg">{PAYROLL_ELEMENTS_CONFIG[PayrollElement.Earnings].icon}</span>
          </div>
        </div>
        <div className="stat-title">{PAYROLL_ELEMENTS_CONFIG[PayrollElement.Earnings].displayName}</div>
        <div className="stat-value text-2xl">{completeness.earnings_percentage}%</div>
        <div className="stat-desc">{completeness.earnings_count}/{completeness.total_employees} 员工</div>
      </div>

      {/* 缴费基数 */}
      <div className="stat">
        <div className="stat-figure text-primary">
          <div className={cn(
            "radial-progress",
            completeness.bases_status === 'complete' && "text-success",
            completeness.bases_status === 'partial' && "text-warning",
            completeness.bases_status === 'empty' && "text-error"
          )} 
          style={{ "--value": completeness.bases_percentage, "--size": "3rem" } as React.CSSProperties}>
            <span className="text-lg">{PAYROLL_ELEMENTS_CONFIG[PayrollElement.Bases].icon}</span>
          </div>
        </div>
        <div className="stat-title">{PAYROLL_ELEMENTS_CONFIG[PayrollElement.Bases].displayName}</div>
        <div className="stat-value text-2xl">{completeness.bases_percentage}%</div>
        <div className="stat-desc">{completeness.bases_count}/{completeness.total_employees} 员工</div>
      </div>

      {/* 人员类别 */}
      <div className="stat">
        <div className="stat-figure text-primary">
          <div className={cn(
            "radial-progress",
            completeness.category_status === 'complete' && "text-success",
            completeness.category_status === 'partial' && "text-warning",
            completeness.category_status === 'empty' && "text-error"
          )} 
          style={{ "--value": completeness.category_percentage, "--size": "3rem" } as React.CSSProperties}>
            <span className="text-lg">{PAYROLL_ELEMENTS_CONFIG[PayrollElement.Category].icon}</span>
          </div>
        </div>
        <div className="stat-title">{PAYROLL_ELEMENTS_CONFIG[PayrollElement.Category].displayName}</div>
        <div className="stat-value text-2xl">{completeness.category_percentage}%</div>
        <div className="stat-desc">{completeness.category_count}/{completeness.total_employees} 员工</div>
      </div>

      {/* 职务信息 */}
      <div className="stat">
        <div className="stat-figure text-primary">
          <div className={cn(
            "radial-progress",
            completeness.job_status === 'complete' && "text-success",
            completeness.job_status === 'partial' && "text-warning",
            completeness.job_status === 'empty' && "text-error"
          )} 
          style={{ "--value": completeness.job_percentage, "--size": "3rem" } as React.CSSProperties}>
            <span className="text-lg">{PAYROLL_ELEMENTS_CONFIG[PayrollElement.Job].icon}</span>
          </div>
        </div>
        <div className="stat-title">{PAYROLL_ELEMENTS_CONFIG[PayrollElement.Job].displayName}</div>
        <div className="stat-value text-2xl">{completeness.job_percentage}%</div>
        <div className="stat-desc">{completeness.job_count}/{completeness.total_employees} 员工</div>
      </div>
    </div>
  );
}