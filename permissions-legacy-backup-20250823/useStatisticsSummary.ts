import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useEmployeeStatistics } from '@/hooks/employee/useEmployeeStatistics';
import { usePayrollAnalytics } from '@/hooks/payroll/usePayrollAnalytics';
import { useEmployeeTrends } from '@/hooks/employee/useEmployeeStatistics';
import type { StatisticsSummary, StatisticsAlert } from '@/types/statistics-extended';

/**
 * 综合统计概览Hook
 * 
 * 整合多个数据源，为仪表板提供核心KPI指标和趋势数据
 * 严格遵循hooks-only数据访问原则
 */
export const useStatisticsSummary = () => {
  // 获取基础统计数据
  const employeeStats = useEmployeeStatistics();
  const payrollAnalytics = usePayrollAnalytics();
  const employeeTrends = useEmployeeTrends(12); // 最近12个月
  
  // 获取当前期间的薪资统计
  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM格式
  const payrollStats = payrollAnalytics.queries.usePayrollStatistics(currentPeriod);
  const payrollTrends = payrollAnalytics.queries.usePayrollTrends({
    startPeriod: new Date(new Date().setMonth(new Date().getMonth() - 11)).toISOString().slice(0, 7),
    endPeriod: currentPeriod
  });

  // 计算综合统计数据
  const summary = useMemo((): StatisticsSummary | null => {
    // 等待所有基础数据加载完成
    if (!employeeStats.data || !payrollStats.data || !employeeTrends.data || !payrollTrends.data) {
      return null;
    }

    const alerts: StatisticsAlert[] = [];
    
    // 计算趋势指标
    const latestTrends = payrollTrends.data;
    const employeeGrowthData = employeeTrends.data.headcount;
    const payrollGrowthData = latestTrends;

    // 计算员工增长率（环比）
    const employeeGrowth = employeeGrowthData.length >= 2 
      ? ((employeeGrowthData[employeeGrowthData.length - 1]?.value || 0) - 
         (employeeGrowthData[employeeGrowthData.length - 2]?.value || 1)) / 
         (employeeGrowthData[employeeGrowthData.length - 2]?.value || 1) * 100
      : 0;

    // 计算薪资增长率（环比）
    const payrollGrowth = payrollGrowthData.length >= 2
      ? payrollGrowthData[payrollGrowthData.length - 1]?.growthRate || 0
      : 0;

    // 计算流动率
    const turnoverData = employeeTrends.data.turnoverRate;
    const currentTurnoverRate = turnoverData.length > 0 
      ? turnoverData[turnoverData.length - 1]?.value || 0
      : 0;

    // 生成警报信息
    if (currentTurnoverRate > 15) {
      alerts.push({
        id: 'high-turnover',
        type: 'warning',
        title: '人员流动率偏高',
        description: `当前流动率为 ${currentTurnoverRate.toFixed(1)}%，建议关注人员稳定性`,
        severity: currentTurnoverRate > 25 ? 'high' : 'medium',
        createdAt: new Date().toISOString()
      });
    }

    if (Math.abs(payrollGrowth) > 20) {
      alerts.push({
        id: 'payroll-volatility',
        type: payrollGrowth > 20 ? 'info' : 'warning',
        title: '薪资支出波动较大',
        description: `薪资支出${payrollGrowth > 0 ? '增长' : '下降'} ${Math.abs(payrollGrowth).toFixed(1)}%`,
        severity: Math.abs(payrollGrowth) > 30 ? 'high' : 'medium',
        createdAt: new Date().toISOString()
      });
    }

    if (employeeStats.data.total === 0) {
      alerts.push({
        id: 'no-employees',
        type: 'error',
        title: '无员工数据',
        description: '系统中未找到员工信息，请检查数据导入',
        severity: 'high',
        createdAt: new Date().toISOString()
      });
    }

    return {
      overview: {
        totalEmployees: employeeStats.data.total,
        totalPayroll: payrollStats.data.totalGrossPay,
        averageSalary: payrollStats.data.averageGrossPay,
        activeDepartments: employeeStats.data.byDepartment.length,
        lastUpdated: new Date().toISOString()
      },
      trends: {
        employeeGrowth: Number(employeeGrowth.toFixed(2)),
        payrollGrowth: Number(payrollGrowth.toFixed(2)),
        turnoverRate: Number(currentTurnoverRate.toFixed(2)),
        budgetUtilization: 0 // 预留字段，当前系统无预算数据
      },
      alerts
    };
  }, [employeeStats.data, payrollStats.data, employeeTrends.data, payrollTrends.data]);

  // 计算加载状态
  const isLoading = employeeStats.isLoading || 
                    payrollStats.isLoading || 
                    employeeTrends.isLoading || 
                    payrollTrends.isLoading;

  // 计算错误状态
  const error = employeeStats.error || 
                payrollStats.error || 
                employeeTrends.error || 
                payrollTrends.error;

  // 刷新所有数据
  const refresh = async () => {
    await Promise.all([
      employeeStats.refetch(),
      payrollStats.refetch(),
      employeeTrends.refetch(),
      payrollTrends.refetch()
    ]);
  };

  return {
    data: summary,
    isLoading,
    error,
    refresh,
    
    // 暴露原始数据查询，供详细分析使用
    rawData: {
      employeeStats,
      payrollStats,
      employeeTrends,
      payrollTrends
    }
  };
};

/**
 * 部门级别的统计概览Hook
 */
export const useStatisticsSummaryByDepartment = (departmentId?: string) => {
  const employeeStats = useEmployeeStatistics({ departmentId });
  const payrollAnalytics = usePayrollAnalytics();
  
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const departmentPayrollStats = payrollAnalytics.queries.useDepartmentStatistics(currentPeriod);

  return useQuery({
    queryKey: ['statistics-summary-department', departmentId, currentPeriod],
    queryFn: async () => {
      if (!employeeStats.data || !departmentPayrollStats.data) {
        throw new Error('数据未加载完成');
      }

      // 筛选指定部门的薪资数据
      const deptPayrollData = departmentId 
        ? departmentPayrollStats.data.find(dept => dept.departmentId === departmentId)
        : null;

      return {
        departmentId: departmentId || 'all',
        employeeCount: employeeStats.data.total,
        totalPayroll: deptPayrollData?.totalGrossPay || 0,
        averageSalary: deptPayrollData?.averageGrossPay || 0,
        percentOfTotal: deptPayrollData?.percentOfTotal || 0
      };
    },
    enabled: !!employeeStats.data && !!departmentPayrollStats.data,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
};

export default useStatisticsSummary;