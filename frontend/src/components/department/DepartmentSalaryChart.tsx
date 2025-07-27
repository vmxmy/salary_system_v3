import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { DepartmentPayrollStatistics } from '@/types/department';

interface DepartmentSalaryChartProps {
  payrollStats: Partial<DepartmentPayrollStatistics> & {
    department_id: string;
    department_name: string;
    employee_count: number;
    min_total_salary?: number;
    max_total_salary?: number;
    average_total_salary?: number;
    total_salary_expense?: number;
  };
  variant?: 'mini' | 'compact' | 'detailed';
  showValues?: boolean;
  className?: string;
}

export function DepartmentSalaryChart({
  payrollStats,
  variant = 'mini',
  showValues = false,
  className
}: DepartmentSalaryChartProps) {
  // 使用 DaisyUI 样式系统
  // 计算薪资分布数据
  const chartData = useMemo(() => {
    const { min_total_salary = 0, max_total_salary = 0, average_total_salary = 0 } = payrollStats;
    
    if (min_total_salary === 0 && max_total_salary === 0) {
      return { bars: [], range: 0, hasData: false };
    }

    const range = max_total_salary - min_total_salary;
    const avgPosition = range > 0 ? ((average_total_salary - min_total_salary) / range) * 100 : 50;
    
    // 创建简化的分布条
    const bars = [
      { 
        position: 0, 
        height: 30, 
        color: 'bg-error/40',
        label: '最低',
        value: min_total_salary
      },
      { 
        position: avgPosition, 
        height: 60, 
        color: 'bg-primary/60',
        label: '平均',
        value: average_total_salary
      },
      { 
        position: 100, 
        height: 45, 
        color: 'bg-success/50',
        label: '最高',
        value: max_total_salary
      }
    ];

    return { bars, range, hasData: true };
  }, [payrollStats]);

  // 格式化薪资数值
  const formatSalary = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`;
    }
    return `${(value / 1000).toFixed(1)}k`;
  };

  if (!chartData.hasData) {
    return (
      <div className={cn(
        'flex items-center justify-center h-12 bg-base-200 rounded-md',
        className
      )}>
        <span className="text-xs text-base-content/50">
          暂无薪资数据
        </span>
      </div>
    );
  }

  if (variant === 'mini') {
    return (
      <div className={cn('relative h-8 bg-base-200 rounded-md overflow-hidden', className)}>
        {/* 渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-r from-error/10 via-primary/20 to-success/15" />
        
        {/* 平均薪资指示器 */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-primary"
          style={{ left: `${chartData.bars[1].position}%` }}
        />
        
        {/* 薪资范围指示器 */}
        <div className="absolute inset-0 flex items-center justify-center">
          {showValues && (
            <span className="text-xs text-base-content/70 font-medium">
              ¥{formatSalary(payrollStats.average_total_salary || 0)}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-2', className)}>
        {/* 图表区域 */}
        <div className="relative h-12 bg-background-tertiary rounded-md overflow-hidden">
          {/* 背景渐变 */}
          <div className="absolute inset-0 bg-gradient-to-r from-error/5 via-primary/10 to-success/8" />
          
          {/* 薪资分布条 */}
          {chartData.bars.map((bar, index) => (
            <div
              key={index}
              className={cn(
                'absolute bottom-0 w-1 rounded-t transition-all duration-300',
                bar.color
              )}
              style={{ 
                left: `${bar.position}%`, 
                height: `${bar.height}%`,
                transform: 'translateX(-50%)'
              }}
            />
          ))}
        </div>
        
        {/* 数值标签 */}
        {showValues && (
          <div className="flex justify-between text-xs text-text-secondary">
            <span>¥{formatSalary(payrollStats.min_total_salary || 0)}</span>
            <span className="font-medium text-primary">
              ¥{formatSalary(payrollStats.average_total_salary || 0)}
            </span>
            <span>¥{formatSalary(payrollStats.max_total_salary || 0)}</span>
          </div>
        )}
      </div>
    );
  }

  // detailed 变体
  return (
    <div className={cn('space-y-3', className)}>
      {/* 图表标题 */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-text-primary">
          薪资分布
        </h4>
        <span className="text-xs text-text-secondary">
          {payrollStats.employee_count} 人
        </span>
      </div>
      
      {/* 详细图表 */}
      <div className="space-y-3">
        {/* 主图表 */}
        <div className="relative h-16 bg-background-tertiary rounded-lg overflow-hidden">
          {/* 背景网格 */}
          <div className="absolute inset-0 opacity-20">
            {[25, 50, 75].map(pos => (
              <div 
                key={pos}
                className="absolute top-0 bottom-0 w-px bg-border-subtle"
                style={{ left: `${pos}%` }}
              />
            ))}
          </div>
          
          {/* 渐变背景 */}
          <div className="absolute inset-0 bg-gradient-to-r from-error/8 via-primary/15 to-success/10" />
          
          {/* 薪资分布条 */}
          {chartData.bars.map((bar, index) => (
            <div
              key={index}
              className={cn(
                'absolute bottom-0 w-2 rounded-t transition-all duration-500',
                bar.color,
                'hover:scale-y-110 hover:shadow-sm'
              )}
              style={{ 
                left: `${bar.position}%`, 
                height: `${bar.height}%`,
                transform: 'translateX(-50%)'
              }}
              title={`${bar.label}: ¥${bar.value.toLocaleString()}`}
            />
          ))}
          
          {/* 平均线 */}
          <div 
            className="absolute top-2 bottom-2 w-px bg-primary shadow-sm"
            style={{ left: `${chartData.bars[1].position}%` }}
          />
        </div>
        
        {/* 图例 */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {chartData.bars.map((bar, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', bar.color)} />
              <span className="text-text-secondary truncate">
                {bar.label}: ¥{formatSalary(bar.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 薪资对比图表组件 - 用于比较多个部门
interface DepartmentSalaryComparisonProps {
  departments: Array<{
    name: string;
    payrollStats: DepartmentPayrollStatistics;
  }>;
  className?: string;
}

export function DepartmentSalaryComparison({
  departments,
  className
}: DepartmentSalaryComparisonProps) {
  // 使用 DaisyUI 样式系统

  const maxSalary = useMemo(() => {
    return Math.max(...departments.map(d => d.payrollStats.max_gross_pay || 0));
  }, [departments]);

  const formatSalary = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`;
    }
    return `${(value / 1000).toFixed(1)}k`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <h4 className="text-sm font-medium text-text-primary">
        部门薪资对比
      </h4>
      
      <div className="space-y-3">
        {departments.map((dept, index) => {
          const avgSalary = dept.payrollStats.avg_gross_pay || 0;
          const barWidth = maxSalary > 0 ? (avgSalary / maxSalary) * 100 : 0;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary truncate">
                  {dept.name}
                </span>
                <span className="text-xs font-medium text-text-primary tabular-nums">
                  ¥{formatSalary(avgSalary)}
                </span>
              </div>
              
              <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}