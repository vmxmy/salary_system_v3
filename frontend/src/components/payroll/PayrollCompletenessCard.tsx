import { motion } from 'framer-motion';
import { cn, cardEffects } from '@/lib/utils';
import type { PayrollPeriodCompleteness, ElementCompleteness } from '@/types/payroll-completeness';
import { 
  PAYROLL_ELEMENTS_CONFIG,
  getElementStatusColor,
  getElementStatusLabel,
  getMetadataStatusLabel,
  getCompletenessLevel
} from '@/types/payroll-completeness';
import { transformToElementsArray } from '@/hooks/payroll/usePayrollPeriodCompleteness';

interface PayrollCompletenessCardProps {
  completeness: PayrollPeriodCompleteness;
  className?: string;
  showDetails?: boolean;
  onElementClick?: (element: ElementCompleteness) => void;
}

/**
 * 薪资周期四要素完整度卡片组件
 * 展示薪资周期的四要素（薪资项目、缴费基数、人员类别、职务信息）完整度
 */
export function PayrollCompletenessCard({
  completeness,
  className,
  showDetails = true,
  onElementClick
}: PayrollCompletenessCardProps) {
  const elements = transformToElementsArray(completeness);
  const completenessLevel = getCompletenessLevel(completeness.overall_completeness_percentage);
  
  return (
    <div className={cn(cardEffects.modern, className)}>
      <div className="card-body">
        {/* 标题区域 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">元数据完整度</h3>
            <p className="text-sm text-base-content/60">
              {completeness.period_name} - {completeness.total_employees} 名员工
            </p>
          </div>
          
          {/* 总体完整度指示器 */}
          <div className="flex flex-col items-end">
            <div className={cn(
              "badge gap-2 px-3 py-4",
              completenessLevel.color === 'success' && "badge-success",
              completenessLevel.color === 'info' && "badge-info",
              completenessLevel.color === 'warning' && "badge-warning",
              completenessLevel.color === 'error' && "badge-error"
            )}>
              <span className="text-2xl font-bold">
                {completeness.overall_completeness_percentage}%
              </span>
            </div>
            <span className="text-xs text-base-content/60 mt-1">
              {getMetadataStatusLabel(completeness.metadata_status)}
            </span>
          </div>
        </div>

        {/* 四要素进度条 */}
        <div className="space-y-3">
          {elements.map((element) => (
            <motion.div
              key={element.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "border rounded-lg p-3 transition-all cursor-pointer",
                "hover:shadow-md hover:border-primary/30",
                element.status === 'complete' && "bg-success/5 border-success/30",
                element.status === 'partial' && "bg-warning/5 border-warning/30",
                element.status === 'empty' && "bg-error/5 border-error/30"
              )}
              onClick={() => onElementClick?.(element)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{element.icon}</span>
                  <span className="font-medium">{element.displayName}</span>
                  <div className={cn(
                    "badge badge-sm",
                    element.status === 'complete' && "badge-success",
                    element.status === 'partial' && "badge-warning",
                    element.status === 'empty' && "badge-error"
                  )}>
                    {getElementStatusLabel(element.status)}
                  </div>
                </div>
                <span className="text-sm text-base-content/60">
                  {element.count}/{element.total}
                </span>
              </div>
              
              {/* 进度条 */}
              <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${element.percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full transition-colors",
                    element.status === 'complete' && "bg-success",
                    element.status === 'partial' && "bg-warning",
                    element.status === 'empty' && "bg-error"
                  )}
                />
              </div>
              
              {/* 详细描述 */}
              {showDetails && (
                <p className="text-xs text-base-content/60 mt-2">
                  {PAYROLL_ELEMENTS_CONFIG[element.name as keyof typeof PAYROLL_ELEMENTS_CONFIG]?.description}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* 操作建议 */}
        {completeness.metadata_status !== 'complete' && (
          <div className="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-bold">数据不完整</h3>
              <div className="text-xs">
                还有 {completeness.total_employees - completeness.complete_employees_count} 名员工的数据不完整，
                请补充完整后再进行薪资计算。
              </div>
            </div>
          </div>
        )}

        {/* 完成状态提示 */}
        {completeness.metadata_status === 'complete' && (
          <div className="alert alert-success mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">数据完整</h3>
              <div className="text-xs">
                所有员工的四要素数据已完整，可以进行薪资计算。
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}