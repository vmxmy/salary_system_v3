import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PayrollPeriodCompleteness } from '@/types/payroll-completeness';
import { getCompletenessLevel, PayrollElement, PAYROLL_ELEMENTS_CONFIG } from '@/types/payroll-completeness';

interface PayrollCompletenessIndicatorProps {
  completeness: PayrollPeriodCompleteness;
  variant?: 'simple' | 'detailed' | 'compact';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * 薪资周期四要素完整度指示器组件
 * 用于在列表或紧凑空间中显示完整度状态
 */
export function PayrollCompletenessIndicator({
  completeness,
  variant = 'simple',
  showLabel = true,
  className,
  onClick
}: PayrollCompletenessIndicatorProps) {
  const completenessLevel = getCompletenessLevel(completeness.overall_completeness_percentage);
  
  if (variant === 'compact') {
    // 紧凑型：只显示百分比和状态色
    return (
      <div 
        className={cn(
          "flex items-center gap-1 cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        <div className={cn(
          "badge badge-sm",
          completenessLevel.color === 'success' && "badge-success",
          completenessLevel.color === 'info' && "badge-info",
          completenessLevel.color === 'warning' && "badge-warning",
          completenessLevel.color === 'error' && "badge-error"
        )}>
          {completeness.overall_completeness_percentage}%
        </div>
        {showLabel && (
          <span className="text-xs text-base-content/60">
            {completenessLevel.label}
          </span>
        )}
      </div>
    );
  }
  
  if (variant === 'simple') {
    // 简单型：显示进度环
    return (
      <div 
        className={cn(
          "flex items-center gap-2 cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        {/* 进度环 */}
        <div className="relative">
          <div className={cn(
            "radial-progress text-xs",
            completenessLevel.color === 'success' && "text-success",
            completenessLevel.color === 'info' && "text-info",
            completenessLevel.color === 'warning' && "text-warning",
            completenessLevel.color === 'error' && "text-error"
          )} 
          style={{ "--value": completeness.overall_completeness_percentage } as React.CSSProperties}
          role="progressbar">
            {completeness.overall_completeness_percentage}%
          </div>
        </div>
        
        {showLabel && (
          <div className="flex flex-col">
            <span className="text-sm font-medium">元数据完整度</span>
            <span className="text-xs text-base-content/60">
              {completeness.complete_employees_count}/{completeness.total_employees} 员工完成
            </span>
          </div>
        )}
      </div>
    );
  }
  
  // 详细型：显示四个要素的小图标
  return (
    <div 
      className={cn(
        "flex flex-col gap-2 p-2 rounded-lg border border-base-200",
        "cursor-pointer hover:bg-base-100/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      {/* 总体进度 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">元数据</span>
        <div className={cn(
          "badge badge-sm",
          completenessLevel.color === 'success' && "badge-success",
          completenessLevel.color === 'info' && "badge-info", 
          completenessLevel.color === 'warning' && "badge-warning",
          completenessLevel.color === 'error' && "badge-error"
        )}>
          {completeness.overall_completeness_percentage}%
        </div>
      </div>
      
      {/* 四要素图标 */}
      <div className="flex items-center gap-1">
        <ElementIcon 
          icon={PAYROLL_ELEMENTS_CONFIG[PayrollElement.Earnings].icon}
          status={completeness.earnings_status}
          percentage={completeness.earnings_percentage}
          tooltip="薪资项目"
        />
        <ElementIcon 
          icon={PAYROLL_ELEMENTS_CONFIG[PayrollElement.Bases].icon}
          status={completeness.bases_status}
          percentage={completeness.bases_percentage}
          tooltip="缴费基数"
        />
        <ElementIcon 
          icon={PAYROLL_ELEMENTS_CONFIG[PayrollElement.Category].icon}
          status={completeness.category_status}
          percentage={completeness.category_percentage}
          tooltip="人员类别"
        />
        <ElementIcon 
          icon={PAYROLL_ELEMENTS_CONFIG[PayrollElement.Job].icon}
          status={completeness.job_status}
          percentage={completeness.job_percentage}
          tooltip="职务信息"
        />
      </div>
      
      {/* 状态文字 */}
      {showLabel && (
        <div className="text-xs text-base-content/60">
          {completeness.metadata_status === 'complete' 
            ? '✓ 数据完整，可计算薪资'
            : completeness.metadata_status === 'incomplete'
            ? `⚠ ${completeness.total_employees - completeness.complete_employees_count} 人数据不完整`
            : '○ 无数据'
          }
        </div>
      )}
    </div>
  );
}

/**
 * 要素图标组件
 */
function ElementIcon({ 
  icon, 
  status, 
  percentage,
  tooltip 
}: { 
  icon: string;
  status: string;
  percentage: number;
  tooltip: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
      className="relative group"
    >
      {/* Tooltip */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-base-300 text-xs px-2 py-1 rounded whitespace-nowrap">
          {tooltip}: {percentage}%
        </div>
      </div>
      
      {/* 图标容器 */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all",
        status === 'complete' && "bg-success/20 text-success",
        status === 'partial' && "bg-warning/20 text-warning",
        status === 'empty' && "bg-error/20 text-error"
      )}>
        {icon}
      </div>
      
      {/* 状态点 */}
      {status === 'complete' && (
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-success rounded-full" />
      )}
      {status === 'partial' && (
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-warning rounded-full" />
      )}
      {status === 'empty' && (
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-error rounded-full" />
      )}
    </motion.div>
  );
}