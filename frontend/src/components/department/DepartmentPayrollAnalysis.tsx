import React, { useState, useMemo, useCallback } from 'react';
import { 
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  DocumentChartBarIcon,
  FunnelIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import { ModernButton } from '@/components/common/ModernButton';
import { MonthPicker } from '@/components/common/MonthPicker';
import { useDepartmentPayrollStats } from '@/hooks/department';
import { DepartmentSalaryChart, DepartmentSalaryComparison } from './DepartmentSalaryChart';
import { cn } from '@/lib/utils';
import type { DepartmentNode } from '@/types/department';

interface DepartmentPayrollAnalysisProps {
  department: DepartmentNode;
  className?: string;
}

interface PayrollFilters {
  year: number;
  month: number;
  compareMode: 'single' | 'trend' | 'benchmark';
  trendMonths: number;
}

export function DepartmentPayrollAnalysis({ 
  department, 
  className 
}: DepartmentPayrollAnalysisProps) {
  const currentDate = new Date();
  const [filters, setFilters] = useState<PayrollFilters>({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    compareMode: 'single',
    trendMonths: 6
  });
  const [showFilters, setShowFilters] = useState(false);

  // 使用 DaisyUI 卡片样式
  const cardClasses = 'card bg-base-100 border border-base-300 shadow-sm';

  // 获取当前月薪资数据
  const { 
    data: currentPayrollStats = [], 
    isLoading: isLoadingCurrent 
  } = useDepartmentPayrollStats({
    year: filters.year,
    month: filters.month,
    departmentIds: [department.id]
  });

  // 获取趋势数据（过去几个月）
  // const _trendQueries = useMemo(() => {
  //   const months = [];
  //   for (let i = 0; i < filters.trendMonths; i++) {
  //     const date = new Date(filters.year, filters.month - 1 - i, 1);
  //     months.push({
  //       year: date.getFullYear(),
  //       month: date.getMonth() + 1
  //     });
  //   }
  //   return months.reverse();
  // }, [filters.year, filters.month, filters.trendMonths]);

  // 获取对比数据
  const { 
    data: benchmarkStats = [], 
    isLoading: isLoadingBenchmark 
  } = useDepartmentPayrollStats({
    year: filters.year,
    month: filters.month
  });

  // 当前部门数据
  const currentDeptStats = currentPayrollStats.find(s => s.department_id === department.id);

  // 计算同比增长
  const { 
    data: lastYearStats = [] 
  } = useDepartmentPayrollStats({
    year: filters.year - 1,
    month: filters.month,
    departmentIds: [department.id]
  });
  const lastYearDeptStats = lastYearStats.find(s => s.department_id === department.id);

  // 计算增长率
  const growthRate = useMemo(() => {
    if (!currentDeptStats || !lastYearDeptStats) return null;
    const current = currentDeptStats.avg_gross_pay || 0;
    const lastYear = lastYearDeptStats.avg_gross_pay || 0;
    if (lastYear === 0) return null;
    return ((current - lastYear) / lastYear) * 100;
  }, [currentDeptStats, lastYearDeptStats]);

  // 计算行业排名（在所有部门中的排名）
  const ranking = useMemo(() => {
    if (!currentDeptStats || benchmarkStats.length === 0) return null;
    const sortedDepts = [...benchmarkStats].sort((a, b) => (b.avg_gross_pay || 0) - (a.avg_gross_pay || 0));
    const rank = sortedDepts.findIndex(d => d.department_id === department.id) + 1;
    return { rank, total: sortedDepts.length };
  }, [currentDeptStats, benchmarkStats, department.id]);

  // 处理筛选变化
  const handleFiltersChange = useCallback((newFilters: Partial<PayrollFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // 统计卡片数据
  const statsCards = useMemo(() => {
    if (!currentDeptStats) return [];

    return [
      {
        title: '平均薪资',
        value: `¥${(currentDeptStats.avg_gross_pay || 0).toLocaleString()}`,
        icon: CurrencyDollarIcon,
        color: 'blue' as const,
        trend: growthRate ? {
          value: `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
          isPositive: growthRate > 0
        } : undefined
      },
      {
        title: '员工总数',
        value: `${currentDeptStats.employee_count || 0}`,
        icon: UsersIcon,
        color: 'green' as const,
        subtitle: '在职员工'
      },
      {
        title: '薪资总额',
        value: `¥${((currentDeptStats.total_gross_pay || 0) / 10000).toFixed(1)}万`,
        icon: ChartBarIcon,
        color: 'purple' as const,
        subtitle: '月度总支出'
      },
      {
        title: '部门排名',
        value: ranking ? `${ranking.rank}/${ranking.total}` : '-',
        icon: DocumentChartBarIcon,
        color: 'yellow' as const,
        subtitle: '平均薪资排名'
      }
    ];
  }, [currentDeptStats, growthRate, ranking]);

  const isLoading = isLoadingCurrent || isLoadingBenchmark;

  return (
    <div className={cn('space-y-6', className)}>
      {/* 标题和筛选器 */}
      <div className={cn(cardClasses, 'p-4')}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-base-content">
                薪资统计分析
              </h3>
              <p className="text-sm text-base-content/70">
                {department.name} • {filters.year}年{filters.month}月
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ModernButton
              variant={showFilters ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              筛选
            </ModernButton>
          </div>
        </div>

        {/* 高级筛选面板 */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-base-200 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-base-content mb-2">
                统计月份
              </label>
              <MonthPicker
                value={`${filters.year}-${String(filters.month).padStart(2, '0')}`}
                onChange={(value) => {
                  const [year, month] = value.split('-');
                  handleFiltersChange({
                    year: parseInt(year),
                    month: parseInt(month)
                  });
                }}
                className="w-full"
                showDataIndicators={true}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-base-content mb-2">
                对比模式
              </label>
              <select
                value={filters.compareMode}
                onChange={(e) => handleFiltersChange({ 
                  compareMode: e.target.value as PayrollFilters['compareMode'] 
                })}
                className="select select-bordered select-sm w-full"
              >
                <option value="single">单月分析</option>
                <option value="trend">趋势分析</option>
                <option value="benchmark">行业对比</option>
              </select>
            </div>
            
            {filters.compareMode === 'trend' && (
              <div>
                <label className="block text-sm font-medium text-base-content mb-2">
                  趋势月数
                </label>
                <select
                  value={filters.trendMonths}
                  onChange={(e) => handleFiltersChange({ 
                    trendMonths: parseInt(e.target.value) 
                  })}
                  className="select select-bordered select-sm w-full"
                >
                  <option value={3}>近3个月</option>
                  <option value={6}>近6个月</option>
                  <option value={12}>近12个月</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {/* 主要分析内容 */}
      {isLoading ? (
        <div className={cn(cardClasses, 'p-8 text-center')}>
          <div className="loading loading-spinner loading-lg text-primary mb-4" />
          <p className="text-base-content/70">加载薪资数据中...</p>
        </div>
      ) : !currentDeptStats ? (
        <div className={cn(cardClasses, 'p-8 text-center')}>
          <CurrencyDollarIcon className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
          <p className="text-lg font-medium text-base-content/70">暂无薪资数据</p>
          <p className="text-sm text-base-content/50 mt-2">
            {filters.year}年{filters.month}月暂无该部门的薪资统计
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 薪资分布图表 */}
          <div className={cn(cardClasses, 'p-6')}>
            <h4 className="text-lg font-semibold text-base-content mb-4">
              薪资分布分析
            </h4>
            <DepartmentSalaryChart
              payrollStats={{
                department_id: department.id,
                department_name: department.name,
                employee_count: currentDeptStats.employee_count || 0,
                min_total_salary: currentDeptStats.min_gross_pay || 0,
                max_total_salary: currentDeptStats.max_gross_pay || 0,
                average_total_salary: currentDeptStats.avg_gross_pay || 0,
                total_salary_expense: currentDeptStats.total_gross_pay || 0
              }}
              variant="detailed"
              showValues
            />
            
            {/* 详细统计 */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-base-300">
              <div className="text-center">
                <div className="text-sm text-base-content/70">薪资范围</div>
                <div className="text-lg font-semibold text-base-content">
                  ¥{(currentDeptStats.min_gross_pay || 0).toLocaleString()} - 
                  ¥{(currentDeptStats.max_gross_pay || 0).toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-base-content/70">标准差</div>
                <div className="text-lg font-semibold text-base-content">
                  ¥{(((currentDeptStats.max_gross_pay || 0) - (currentDeptStats.min_gross_pay || 0)) / 4).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* 同比分析或行业对比 */}
          <div className={cn(cardClasses, 'p-6')}>
            {filters.compareMode === 'benchmark' ? (
              <>
                <h4 className="text-lg font-semibold text-base-content mb-4">
                  行业对比分析
                </h4>
                <DepartmentSalaryComparison
                  departments={benchmarkStats.slice(0, 8).map(stat => ({
                    name: stat.department_name || '未知部门',
                    payrollStats: stat
                  }))}
                />
              </>
            ) : (
              <>
                <h4 className="text-lg font-semibold text-base-content mb-4">
                  同比增长分析
                </h4>
                
                {growthRate !== null ? (
                  <div className="space-y-4">
                    {/* 增长率指示器 */}
                    <div className="flex items-center justify-center">
                      <div className={cn(
                        'flex items-center gap-2 px-4 py-3 rounded-lg',
                        growthRate > 0 
                          ? 'bg-success/10 text-success' 
                          : growthRate < 0 
                            ? 'bg-error/10 text-error' 
                            : 'bg-base-200 text-base-content/70'
                      )}>
                        {growthRate > 0 ? (
                          <ArrowUpIcon className="w-5 h-5" />
                        ) : growthRate < 0 ? (
                          <ArrowDownIcon className="w-5 h-5" />
                        ) : (
                          <ArrowsUpDownIcon className="w-5 h-5" />
                        )}
                        <span className="text-2xl font-bold">
                          {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* 对比详情 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-base-200 rounded-lg">
                        <div className="text-sm text-base-content/70">去年同期</div>
                        <div className="text-lg font-semibold text-base-content">
                          ¥{(lastYearDeptStats?.avg_gross_pay || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-primary/10 rounded-lg">
                        <div className="text-sm text-primary">当前水平</div>
                        <div className="text-lg font-semibold text-primary">
                          ¥{(currentDeptStats.avg_gross_pay || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* 增长分析 */}
                    <div className="p-3 bg-info/5 border border-info/20 rounded-lg">
                      <div className="text-sm text-info">
                        📊 分析结果：
                        {growthRate > 10 
                          ? '薪资增长显著，表现优秀' 
                          : growthRate > 0 
                            ? '薪资稳步增长，发展良好' 
                            : growthRate > -5 
                              ? '薪资基本稳定，略有波动' 
                              : '薪资下降较多，需要关注'
                        }
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-base-content/70">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无去年同期数据</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 详细数据表格 */}
      {currentDeptStats && (
        <div className={cn(cardClasses, 'p-6')}>
          <h4 className="text-lg font-semibold text-base-content mb-4">
            详细薪资数据
          </h4>
          
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>指标</th>
                  <th>数值</th>
                  <th>占比</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>总薪资支出</td>
                  <td className="font-semibold">
                    ¥{(currentDeptStats.total_gross_pay || 0).toLocaleString()}
                  </td>
                  <td>
                    {currentDeptStats.dept_gross_pay_percentage?.toFixed(1)}%
                  </td>
                  <td className="text-base-content/70">月度总支出</td>
                </tr>
                <tr>
                  <td>实发总额</td>
                  <td className="font-semibold">
                    ¥{(currentDeptStats.total_net_pay || 0).toLocaleString()}
                  </td>
                  <td>
                    {((currentDeptStats.total_net_pay || 0) / (currentDeptStats.total_gross_pay || 1) * 100).toFixed(1)}%
                  </td>
                  <td className="text-base-content/70">扣除五险一金后</td>
                </tr>
                <tr>
                  <td>总扣除额</td>
                  <td className="font-semibold">
                    ¥{(currentDeptStats.total_deductions || 0).toLocaleString()}
                  </td>
                  <td>
                    {((currentDeptStats.total_deductions || 0) / (currentDeptStats.total_gross_pay || 1) * 100).toFixed(1)}%
                  </td>
                  <td className="text-base-content/70">五险一金等</td>
                </tr>
                <tr>
                  <td>平均实发</td>
                  <td className="font-semibold">
                    ¥{(currentDeptStats.avg_net_pay || 0).toLocaleString()}
                  </td>
                  <td>
                    {((currentDeptStats.avg_net_pay || 0) / (currentDeptStats.avg_gross_pay || 1) * 100).toFixed(1)}%
                  </td>
                  <td className="text-base-content/70">人均实发薪资</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'yellow';
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, color, trend, subtitle }: StatCardProps) {
  const cardClasses = 'card bg-base-100 border border-base-300 shadow-sm';

  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-500 dark:bg-green-400/10 dark:text-green-400',
    purple: 'bg-purple-500/10 text-purple-500 dark:bg-purple-400/10 dark:text-purple-400',
    yellow: 'bg-yellow-500/10 text-yellow-500 dark:bg-yellow-400/10 dark:text-yellow-400'
  };

  return (
    <div className={cardClasses}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-base-content/70">{title}</p>
            <p className="text-2xl font-bold text-base-content mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-base-content/50 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={cn(
                'flex items-center gap-1 mt-2 text-xs',
                trend.isPositive ? 'text-success' : 'text-error'
              )}>
                {trend.isPositive ? (
                  <ArrowUpIcon className="w-3 h-3" />
                ) : (
                  <ArrowDownIcon className="w-3 h-3" />
                )}
                <span>{trend.value}</span>
                <span className="text-base-content/50">同比</span>
              </div>
            )}
          </div>
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
            colorClasses[color]
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}