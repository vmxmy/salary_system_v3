import React, { useState, useMemo, useCallback } from 'react';
import { 
  CurrencyDollarIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  DocumentChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { ModernButton } from '@/components/common/ModernButton';
import { MonthPicker } from '@/components/common/MonthPicker';
import { useDepartmentTree, useDepartmentPayrollStats } from '@/hooks/useDepartments';
import { DepartmentSalaryComparison, DepartmentSalaryChart } from '@/components/department/DepartmentSalaryChart';
import { DepartmentPayrollAnalysis } from '@/components/department/DepartmentPayrollAnalysis';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import type { DepartmentPayrollStatistics } from '@/types/department';

interface PayrollStatsFilters {
  year: number;
  month: number;
  departmentIds: string[];
  viewMode: 'overview' | 'comparison' | 'detailed';
  sortBy: 'avg_salary' | 'total_salary' | 'employee_count' | 'dept_name';
  sortOrder: 'asc' | 'desc';
}

export default function DepartmentPayrollStatsPage() {
  const currentDate = new Date();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  
  const [filters, setFilters] = useState<PayrollStatsFilters>({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    departmentIds: [],
    viewMode: 'overview',
    sortBy: 'avg_salary',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

  // DaisyUI classes for styling

  // 获取部门树数据
  const { data: departmentTree = [], isLoading: isLoadingDepartments } = useDepartmentTree();

  // 获取薪资统计数据
  const { 
    data: payrollStats = [], 
    isLoading: isLoadingStats,
    refetch: refetchStats
  } = useDepartmentPayrollStats({
    year: filters.year,
    month: filters.month,
    departmentIds: filters.departmentIds.length > 0 ? filters.departmentIds : undefined
  });

  // 获取上月数据用于对比
  const previousMonth = useMemo(() => {
    const prevDate = new Date(filters.year, filters.month - 2, 1);
    return {
      year: prevDate.getFullYear(),
      month: prevDate.getMonth() + 1
    };
  }, [filters.year, filters.month]);

  const { data: previousMonthStats = [] } = useDepartmentPayrollStats({
    year: previousMonth.year,
    month: previousMonth.month,
    departmentIds: filters.departmentIds.length > 0 ? filters.departmentIds : undefined
  });

  // 扁平化部门树
  const flatDepartments = useMemo(() => {
    const flatten = (nodes: typeof departmentTree): Array<{ id: string; name: string; full_path?: string }> => {
      const result: Array<{ id: string; name: string; full_path?: string }> = [];
      nodes.forEach(node => {
        result.push({ id: node.id, name: node.name, full_path: node.name });
        if (node.children) {
          result.push(...flatten(node.children));
        }
      });
      return result;
    };
    return flatten(departmentTree);
  }, [departmentTree]);

  // 排序后的薪资数据
  const sortedPayrollStats = useMemo(() => {
    const sorted = [...payrollStats].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (filters.sortBy) {
        case 'avg_salary':
          aVal = a.avg_gross_pay || 0;
          bVal = b.avg_gross_pay || 0;
          break;
        case 'total_salary':
          aVal = a.total_gross_pay || 0;
          bVal = b.total_gross_pay || 0;
          break;
        case 'employee_count':
          aVal = a.employee_count || 0;
          bVal = b.employee_count || 0;
          break;
        case 'dept_name':
          aVal = a.department_name ?? '';
          bVal = b.department_name ?? '';
          break;
        default:
          aVal = a.avg_gross_pay || 0;
          bVal = b.avg_gross_pay || 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return filters.sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return filters.sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [payrollStats, filters.sortBy, filters.sortOrder]);

  // 计算总体统计
  const overallStats = useMemo(() => {
    const totalEmployees = payrollStats.reduce((sum, stat) => sum + (stat.employee_count || 0), 0);
    const totalSalary = payrollStats.reduce((sum, stat) => sum + (stat.total_gross_pay || 0), 0);
    const avgSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0;
    const totalDepartments = payrollStats.length;
    
    // 计算对比数据
    const prevTotalEmployees = previousMonthStats.reduce((sum, stat) => sum + (stat.employee_count || 0), 0);
    const prevTotalSalary = previousMonthStats.reduce((sum, stat) => sum + (stat.total_gross_pay || 0), 0);
    const prevAvgSalary = prevTotalEmployees > 0 ? prevTotalSalary / prevTotalEmployees : 0;

    const employeeGrowth = prevTotalEmployees > 0 ? ((totalEmployees - prevTotalEmployees) / prevTotalEmployees) * 100 : 0;
    const salaryGrowth = prevAvgSalary > 0 ? ((avgSalary - prevAvgSalary) / prevAvgSalary) * 100 : 0;

    return {
      totalEmployees,
      totalSalary,
      avgSalary,
      totalDepartments,
      employeeGrowth,
      salaryGrowth
    };
  }, [payrollStats, previousMonthStats]);

  // 获取选中部门详情
  const selectedDepartment = useMemo(() => {
    if (!selectedDepartmentId) return null;
    return flatDepartments.find(dept => dept.id === selectedDepartmentId);
  }, [selectedDepartmentId, flatDepartments]);

  // 处理筛选变化
  const handleFiltersChange = useCallback((newFilters: Partial<PayrollStatsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // 处理导出
  const handleExport = useCallback(() => {
    showInfo('导出功能开发中...');
  }, [showInfo]);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    refetchStats();
    showSuccess('数据已刷新');
  }, [refetchStats, showSuccess]);

  const isLoading = isLoadingDepartments || isLoadingStats;

  return (
    <>
      <PageHeader
        title="部门薪资统计"
        description="分析各部门薪资水平，对比薪资趋势和分布"
        icon={CurrencyDollarIcon}
        iconClassName="text-green-500 dark:text-green-400"
        actions={
          <div className="flex flex-wrap gap-3">
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新
            </ModernButton>
            <ModernButton
              variant={showFilters ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              筛选
            </ModernButton>
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={handleExport}
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              导出
            </ModernButton>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* 筛选面板 */}
          {showFilters && (
            <div className={cn('card bg-base-100 shadow-xl', 'p-4')}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
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
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    查看模式
                  </label>
                  <select
                    value={filters.viewMode}
                    onChange={(e) => handleFiltersChange({ 
                      viewMode: e.target.value as PayrollStatsFilters['viewMode'] 
                    })}
                    className="select select-bordered select-sm w-full"
                  >
                    <option value="overview">总览模式</option>
                    <option value="comparison">对比模式</option>
                    <option value="detailed">详细模式</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    排序方式
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFiltersChange({ 
                      sortBy: e.target.value as PayrollStatsFilters['sortBy'] 
                    })}
                    className="select select-bordered select-sm w-full"
                  >
                    <option value="avg_salary">平均薪资</option>
                    <option value="total_salary">薪资总额</option>
                    <option value="employee_count">员工数量</option>
                    <option value="dept_name">部门名称</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    排序顺序
                  </label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFiltersChange({ 
                      sortOrder: e.target.value as PayrollStatsFilters['sortOrder'] 
                    })}
                    className="select select-bordered select-sm w-full"
                  >
                    <option value="desc">降序</option>
                    <option value="asc">升序</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 总体统计卡片 - 使用 DaisyUI stats 组件 */}
          <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-figure text-primary">
                <BuildingOfficeIcon className="w-8 h-8" />
              </div>
              <div className="stat-title">部门总数</div>
              <div className="stat-value text-primary">{overallStats.totalDepartments}</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-info">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="stat-title">员工总数</div>
              <div className="stat-value text-info">{overallStats.totalEmployees}</div>
              {overallStats.employeeGrowth !== 0 && (
                <div className="stat-desc">
                  {overallStats.employeeGrowth > 0 ? '↗︎' : '↘︎'} {Math.abs(overallStats.employeeGrowth).toFixed(1)}% 环比
                </div>
              )}
            </div>

            <div className="stat">
              <div className="stat-figure text-success">
                <CurrencyDollarIcon className="w-8 h-8" />
              </div>
              <div className="stat-title">平均薪资</div>
              <div className="stat-value text-success">¥{overallStats.avgSalary.toLocaleString()}</div>
              {overallStats.salaryGrowth !== 0 && (
                <div className="stat-desc">
                  {overallStats.salaryGrowth > 0 ? '↗︎' : '↘︎'} {Math.abs(overallStats.salaryGrowth).toFixed(1)}% 环比
                </div>
              )}
            </div>

            <div className="stat">
              <div className="stat-figure text-warning">
                <ChartBarIcon className="w-8 h-8" />
              </div>
              <div className="stat-title">薪资总额</div>
              <div className="stat-value text-warning">¥{(overallStats.totalSalary / 10000).toFixed(1)}万</div>
            </div>
          </div>

          {/* 主要内容区域 */}
          {isLoading ? (
            <div className={cn('card bg-base-100 shadow-xl', 'p-8 text-center')}>
              <div className="loading loading-spinner loading-lg text-primary mb-4" />
              <p className="text-text-secondary">加载薪资数据中...</p>
            </div>
          ) : sortedPayrollStats.length === 0 ? (
            <div className={cn('card bg-base-100 shadow-xl', 'p-8 text-center')}>
              <CurrencyDollarIcon className="w-16 h-16 text-text-disabled mx-auto mb-4" />
              <p className="text-lg font-medium text-text-secondary">暂无薪资数据</p>
              <p className="text-sm text-text-tertiary mt-2">
                {filters.year}年{filters.month}月暂无薪资统计数据
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：部门列表和对比图表 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 部门薪资对比 */}
                <div className={cn('card bg-base-100 shadow-xl', 'p-6')}>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    部门薪资对比
                  </h3>
                  <DepartmentSalaryComparison
                    departments={sortedPayrollStats.slice(0, 10).map(stat => ({
                      name: stat.department_name ?? '未知部门',
                      payrollStats: stat
                    }))}
                  />
                </div>

                {/* 部门数据表格 */}
                <div className={cn('card bg-base-100 shadow-xl', 'p-6')}>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    详细数据列表
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="table table-sm w-full">
                      <thead>
                        <tr>
                          <th>部门名称</th>
                          <th>员工数</th>
                          <th>平均薪资</th>
                          <th>薪资总额</th>
                          <th>薪资占比</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPayrollStats.map((stat) => (
                          <tr key={stat.department_id} className="hover">
                            <td>
                              <div className="font-medium text-text-primary">
                                {stat.department_name}
                              </div>
                            </td>
                            <td>{stat.employee_count}</td>
                            <td className="font-semibold">
                              ¥{(stat.avg_gross_pay || 0).toLocaleString()}
                            </td>
                            <td>
                              ¥{((stat.total_gross_pay || 0) / 10000).toFixed(1)}万
                            </td>
                            <td>
                              <span className="badge badge-outline">
                                {stat.dept_gross_pay_percentage?.toFixed(1)}%
                              </span>
                            </td>
                            <td>
                              <ModernButton
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDepartmentId(stat.department_id)}
                              >
                                <DocumentChartBarIcon className="w-4 h-4 mr-1" />
                                详情
                              </ModernButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 右侧：选中部门详细分析 */}
              <div className="space-y-6">
                {selectedDepartmentId && selectedDepartment ? (
                  <div className={cn('card bg-base-100 shadow-xl', 'p-6')}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-text-primary">
                        部门详情分析
                      </h3>
                      <ModernButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDepartmentId(null)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </ModernButton>
                    </div>
                    <DepartmentPayrollAnalysis
                      department={{
                        id: selectedDepartment.id,
                        name: selectedDepartment.name,
                        full_path: selectedDepartment.full_path
                      } as any}
                      className="border-0 shadow-none"
                    />
                  </div>
                ) : (
                  <div className={cn('card bg-base-100 shadow-xl', 'p-6 text-center')}>
                    <DocumentChartBarIcon className="w-12 h-12 text-text-disabled mx-auto mb-3" />
                    <p className="text-text-secondary">选择部门查看详细分析</p>
                    <p className="text-sm text-text-tertiary mt-1">
                      点击部门列表中的"详情"按钮
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PageContent>
    </>
  );
}

