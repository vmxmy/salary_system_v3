import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PayrollPeriodCompleteness } from '@/types/payroll-completeness';
import { 
  PayrollElement,
  PAYROLL_ELEMENTS_CONFIG,
  getCompletenessLevel 
} from '@/types/payroll-completeness';

interface PayrollCompletenessStatProps {
  completeness: PayrollPeriodCompleteness | null;
  variant?: 'default' | 'compact' | 'detailed';
  showPeriodName?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * 四要素完整度统计卡片组件
 * 标准化的统计展示组件，可用于仪表板、概览页等
 */
export function PayrollCompletenessStat({
  completeness,
  variant = 'default',
  showPeriodName = true,
  className,
  onClick
}: PayrollCompletenessStatProps) {
  if (!completeness) {
    return (
      <div className={cn("card bg-base-100 shadow-sm border border-base-200", className)}>
        <div className="card-body">
          <div className="flex items-center justify-center h-32">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  const completenessLevel = getCompletenessLevel(completeness.overall_completeness_percentage);
  
  // 紧凑版本
  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          "stats shadow-sm border border-base-200 cursor-pointer hover:shadow-md transition-shadow",
          className
        )}
        onClick={onClick}
      >
        <div className="stat">
          <div className="stat-figure text-primary">
            <div className={cn(
              "radial-progress",
              completenessLevel.color === 'success' && "text-success",
              completenessLevel.color === 'info' && "text-info",
              completenessLevel.color === 'warning' && "text-warning",
              completenessLevel.color === 'error' && "text-error"
            )} 
            style={{ "--value": completeness.overall_completeness_percentage, "--size": "3rem" } as React.CSSProperties}>
              <span className="text-xs font-bold">{completeness.overall_completeness_percentage}%</span>
            </div>
          </div>
          <div className="stat-title">四要素完整度</div>
          <div className="stat-value text-2xl">
            {completeness.complete_employees_count}/{completeness.total_employees}
          </div>
          <div className="stat-desc">
            {completeness.metadata_status === 'complete' ? '✓ 可计算薪资' : '⚠ 数据不完整'}
          </div>
        </div>
      </div>
    );
  }

  // 详细版本
  if (variant === 'detailed') {
    return (
      <div 
        className={cn(
          "card bg-base-100 shadow-sm border border-base-200 cursor-pointer hover:shadow-md transition-shadow",
          className
        )}
        onClick={onClick}
      >
        <div className="card-body">
          {/* 标题和周期信息 */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">四要素完整度</h3>
              {showPeriodName && (
                <p className="text-sm text-base-content/60">{completeness.period_name}</p>
              )}
            </div>
            <div className={cn(
              "badge badge-lg gap-2",
              completenessLevel.color === 'success' && "badge-success",
              completenessLevel.color === 'info' && "badge-info",
              completenessLevel.color === 'warning' && "badge-warning",
              completenessLevel.color === 'error' && "badge-error"
            )}>
              <span className="text-xl font-bold">{completeness.overall_completeness_percentage}%</span>
            </div>
          </div>

          {/* 四要素详细统计 */}
          <div className="grid grid-cols-2 gap-3">
            <ElementStatItem
              icon={PAYROLL_ELEMENTS_CONFIG[PayrollElement.Earnings].icon}
              label="薪资项目"
              count={completeness.earnings_count}
              total={completeness.total_employees}
              status={completeness.earnings_status}
            />
            <ElementStatItem
              icon={PAYROLL_ELEMENTS_CONFIG[PayrollElement.Bases].icon}
              label="缴费基数"
              count={completeness.bases_count}
              total={completeness.total_employees}
              status={completeness.bases_status}
            />
            <ElementStatItem
              icon={PAYROLL_ELEMENTS_CONFIG[PayrollElement.Category].icon}
              label="人员类别"
              count={completeness.category_count}
              total={completeness.total_employees}
              status={completeness.category_status}
            />
            <ElementStatItem
              icon={PAYROLL_ELEMENTS_CONFIG[PayrollElement.Job].icon}
              label="职务信息"
              count={completeness.job_count}
              total={completeness.total_employees}
              status={completeness.job_status}
            />
          </div>

          {/* 底部状态信息 */}
          <div className="divider my-2"></div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-base-content/60">
              {completeness.complete_employees_count} / {completeness.total_employees} 员工数据完整
            </span>
            {completeness.metadata_status === 'complete' ? (
              <span className="text-success font-medium">✓ 可计算</span>
            ) : (
              <span className="text-warning font-medium">⚠ 待补充</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 默认版本
  return (
    <div 
      className={cn(
        "stats shadow-sm border border-base-200 cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <div className="stat">
        <div className="stat-figure">
          <div className={cn(
            "radial-progress text-2xl",
            completenessLevel.color === 'success' && "text-success",
            completenessLevel.color === 'info' && "text-info",
            completenessLevel.color === 'warning' && "text-warning",
            completenessLevel.color === 'error' && "text-error"
          )} 
          style={{ "--value": completeness.overall_completeness_percentage, "--size": "4rem" } as React.CSSProperties}>
            <span className="text-base font-bold">{completeness.overall_completeness_percentage}%</span>
          </div>
        </div>
        <div className="stat-title">四要素完整度</div>
        <div className="stat-value">
          {completeness.complete_employees_count}/{completeness.total_employees}
        </div>
        <div className="stat-desc">
          <div className="flex items-center gap-4 mt-2">
            <MiniElementIndicator
              icon="💰"
              status={completeness.earnings_status}
              tooltip="薪资项目"
            />
            <MiniElementIndicator
              icon="🏦"
              status={completeness.bases_status}
              tooltip="缴费基数"
            />
            <MiniElementIndicator
              icon="👥"
              status={completeness.category_status}
              tooltip="人员类别"
            />
            <MiniElementIndicator
              icon="🏢"
              status={completeness.job_status}
              tooltip="职务信息"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 单个要素统计项（用于详细版本）
 */
function ElementStatItem({
  icon,
  label,
  count,
  total,
  status
}: {
  icon: string;
  label: string;
  count: number;
  total: number;
  status: string;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        status === 'complete' && "bg-success/5 border-success/30",
        status === 'partial' && "bg-warning/5 border-warning/30",
        status === 'empty' && "bg-error/5 border-error/30"
      )}
    >
      <div className="text-2xl">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-base-content/60">
          {count}/{total} ({percentage}%)
        </div>
      </div>
      <div className={cn(
        "w-2 h-2 rounded-full",
        status === 'complete' && "bg-success",
        status === 'partial' && "bg-warning",
        status === 'empty' && "bg-error"
      )} />
    </motion.div>
  );
}

/**
 * 迷你要素指示器（用于默认版本）
 */
function MiniElementIndicator({
  icon,
  status,
  tooltip
}: {
  icon: string;
  status: string;
  tooltip: string;
}) {
  return (
    <div className="relative group">
      {/* Tooltip */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-base-300 text-xs px-2 py-1 rounded whitespace-nowrap">
          {tooltip}
        </div>
      </div>
      
      {/* 图标 */}
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-xs",
        status === 'complete' && "bg-success/20",
        status === 'partial' && "bg-warning/20",
        status === 'empty' && "bg-error/20"
      )}>
        {icon}
      </div>
    </div>
  );
}