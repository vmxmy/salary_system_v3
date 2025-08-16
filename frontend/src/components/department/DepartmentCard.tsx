import { useState, useCallback } from 'react';
import { 
  BuildingOfficeIcon, 
  UsersIcon, 
  CurrencyDollarIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon 
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { FinancialCard } from '@/components/common/FinancialCard';
import { ModernButton } from '@/components/common/ModernButton';
import type { DepartmentNode, DepartmentPayrollStatistics } from '@/types/department';

interface DepartmentCardProps {
  department: DepartmentNode;
  payrollStats?: DepartmentPayrollStatistics;
  isSelected?: boolean;
  onSelect?: () => void;
  onMenuAction?: (action: string) => void;
  showPayrollStats?: boolean;
  className?: string;
  // Batch selection props
  selectionMode?: boolean;
  isChecked?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

export function DepartmentCard({
  department,
  payrollStats,
  isSelected = false,
  onSelect,
  onMenuAction,
  showPayrollStats = true,
  className,
  selectionMode = false,
  isChecked = false,
  onCheckChange
}: DepartmentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const employeeCount = department.employee_count || 0;
  const hasSubDepartments = department.children && department.children.length > 0;
  
  // DaisyUI classes for styling

  const handleSelect = useCallback(() => {
    onSelect?.();
  }, [onSelect]);

  const handleMenuAction = useCallback((action: string) => {
    onMenuAction?.(action);
    setShowMenu(false);
  }, [onMenuAction]);

  const handleCheckChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onCheckChange?.(e.target.checked);
  }, [onCheckChange]);

  // 格式化薪资数值
  const formatSalary = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`;
    }
    return value.toLocaleString();
  };

  // 根据薪资统计确定卡片变体
  const getCardVariant = () => {
    if (!showPayrollStats || !payrollStats) return 'secondary';
    
    const avgSalary = payrollStats.avg_gross_pay || 0;
    if (avgSalary >= 15000) return 'success';
    if (avgSalary >= 10000) return 'info';
    if (avgSalary >= 8000) return 'warning';
    return 'secondary';
  };

  return (
    <FinancialCard
      title={department.name}
      amount={department.employee_count || 0}
      variant={getCardVariant()}
      size="md"
      className={cn(
        'relative cursor-pointer transition-all duration-300',
        'hover:shadow-lg hover:scale-[1.02]',
        isSelected && 'ring-2 ring-primary/30 shadow-lg scale-[1.02]',
        className
      )}
      onClick={handleSelect}
    >
      {/* 卡片头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 选择模式下的复选框 */}
          {selectionMode && (
            <input
              type="checkbox"
              checked={isChecked}
              onChange={handleCheckChange}
              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary focus:ring-2"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          
          {/* 部门图标 */}
          <div className="rounded-lg bg-primary/10 p-2">
            <BuildingOfficeIcon className="w-5 h-5" />
          </div>
          
          {/* 部门信息 */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-text-primary truncate mb-1">
              {department.name}
            </h3>
            
            {/* 部门层级路径 */}
            {department.full_path && department.level && department.level > 0 && (
              <p className="text-xs text-text-tertiary truncate">
                {department.full_path}
              </p>
            )}
          </div>
        </div>

        {/* 操作菜单 */}
        <div className="relative flex-shrink-0">
          <ModernButton
            variant="ghost"
            size="sm"
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity',
              showMenu && 'opacity-100'
            )}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </ModernButton>

          {/* 下拉菜单 */}
          {showMenu && (
            <div className={cn(
              'card card-compact bg-base-100 shadow-xl',
              'absolute right-0 top-full mt-1 z-50',
              'min-w-[160px] py-1'
            )}>
              <button
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-secondary transition-colors"
                onClick={() => handleMenuAction('view')}
              >
                查看详情
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-secondary transition-colors"
                onClick={() => handleMenuAction('edit')}
              >
                编辑部门
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-secondary transition-colors"
                onClick={() => handleMenuAction('addChild')}
              >
                添加子部门
              </button>
              <div className="border-t border-border-subtle my-1" />
              <button
                className="w-full px-3 py-2 text-left text-sm text-error hover:bg-error/10 transition-colors"
                onClick={() => handleMenuAction('delete')}
              >
                删除部门
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 部门统计信息 */}
      <div className="space-y-3">
        {/* 员工数量 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">
              员工数量
            </span>
          </div>
          <span className="text-sm font-semibold text-text-primary">
            {employeeCount} 人
          </span>
        </div>

        {/* 薪资统计 */}
        {showPayrollStats && payrollStats && (
          <>
            {/* 平均薪资 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="w-4 h-4 text-text-secondary" />
                <span className="text-sm text-text-secondary">
                  平均薪资
                </span>
              </div>
              <span className="text-sm font-semibold text-text-primary tabular-nums">
                ¥{formatSalary(payrollStats.avg_gross_pay || 0)}
              </span>
            </div>

            {/* 薪资范围 */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">
                薪资范围
              </span>
              <span className="text-xs text-text-secondary tabular-nums">
                ¥{formatSalary(payrollStats.min_gross_pay || 0)} - 
                ¥{formatSalary(payrollStats.max_gross_pay || 0)}
              </span>
            </div>

            {/* 薪资总额 */}
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <span className="text-sm text-text-secondary">
                总薪资支出
              </span>
              <span className="text-sm font-semibold text-primary tabular-nums">
                ¥{formatSalary(payrollStats.total_gross_pay || 0)}
              </span>
            </div>
          </>
        )}

        {/* 子部门指示器 */}
        {hasSubDepartments && (
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <span className="text-xs text-text-secondary">
              子部门数量
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-secondary">
                {department.children?.length} 个
              </span>
              <ChevronRightIcon className="w-3 h-3 text-text-tertiary" />
            </div>
          </div>
        )}
      </div>

      {/* 迷你薪资趋势图（占位符，未来可以添加真实的图表） */}
      {showPayrollStats && payrollStats && (payrollStats.employee_count || 0) > 0 && (
        <div className="mt-4 pt-3 border-t border-border-subtle">
          <div className="h-8 bg-gradient-to-r from-background-tertiary via-primary/20 to-background-tertiary rounded-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            <div className="flex items-center justify-center h-full">
              <span className="text-xs text-text-tertiary">
                薪资分布图
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 点击外部关闭菜单 */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </FinancialCard>
  );
}