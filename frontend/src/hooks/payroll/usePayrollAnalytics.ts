import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 统计类型定义
export interface PayrollStatistics {
  period: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  averageGrossPay: number;
  averageDeductions: number;
  averageNetPay: number;
  statusCounts: {
    draft: number;
    approved: number;
    paid: number;
    cancelled: number;
  };
}

// 部门统计
export interface DepartmentStatistics {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  averageGrossPay: number;
  averageNetPay: number;
  percentOfTotal: number;
}

// 趋势数据
export interface PayrollTrend {
  period: string;
  year: number;
  month: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  employeeCount: number;
  growthRate: number;
  yearOverYear: number;
}

// 成分分析
export interface ComponentAnalysis {
  componentId: string;
  componentName: string;
  componentType: 'earning' | 'deduction';
  totalAmount: number;
  averageAmount: number;
  employeeCount: number;
  percentOfTotal: number;
}

// 对比分析参数
export interface ComparisonParams {
  basePeriod: string;
  comparePeriod: string;
  departmentId?: string;
}

// 对比结果
export interface ComparisonResult {
  metric: string;
  basePeriodValue: number;
  comparePeriodValue: number;
  difference: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
}

// 报表配置
export interface ReportConfig {
  type: 'summary' | 'detail' | 'trend' | 'comparison' | 'distribution';
  periodStart: string;
  periodEnd: string;
  departmentIds?: string[];
  includeInactive?: boolean;
  groupBy?: 'department' | 'position' | 'category';
  sortBy?: 'amount' | 'count' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// 查询键管理
export const analyticsQueryKeys = {
  all: ['payroll-analytics'] as const,
  statistics: (period: string) => [...analyticsQueryKeys.all, 'statistics', period] as const,
  departments: (period: string) => [...analyticsQueryKeys.all, 'departments', period] as const,
  trends: (params: any) => [...analyticsQueryKeys.all, 'trends', params] as const,
  components: (period: string) => [...analyticsQueryKeys.all, 'components', period] as const,
  comparison: (params: ComparisonParams) => [...analyticsQueryKeys.all, 'comparison', params] as const,
  distribution: (period: string, groupBy: string) => [...analyticsQueryKeys.all, 'distribution', period, groupBy] as const,
  report: (config: ReportConfig) => [...analyticsQueryKeys.all, 'report', config] as const,
};

/**
 * 薪资分析 Hook
 */
export function usePayrollAnalytics() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // 获取薪资统计汇总
  const usePayrollStatistics = (period?: string) => {
    const targetPeriod = period || selectedPeriod;
    
    return useQuery({
      queryKey: analyticsQueryKeys.statistics(targetPeriod),
      queryFn: async (): Promise<PayrollStatistics> => {
        const { data, error } = await (supabase as any).rpc('get_payroll_statistics', {
          p_period: targetPeriod
        });

        if (error) {
          handleError(error, { customMessage: '获取薪资统计失败' });
          throw error;
        }

        // 如果RPC不存在，使用视图查询
        if (!data) {
          const { data: viewData, error: viewError } = await supabase
            .from('view_payroll_summary')
            .select('*')
            .eq('pay_month', targetPeriod);

          if (viewError) {
            handleError(viewError, { customMessage: '获取薪资统计失败' });
            throw viewError;
          }

          // 聚合计算
          const stats = (viewData || []).reduce((acc, item) => {
            acc.totalEmployees++;
            acc.totalGrossPay += item.gross_pay || 0;
            acc.totalDeductions += item.total_deductions || 0;
            acc.totalNetPay += item.net_pay || 0;
            
            if (item.payroll_status && item.payroll_status in acc.statusCounts) {
              acc.statusCounts[item.payroll_status as keyof typeof acc.statusCounts]++;
            }
            
            return acc;
          }, {
            period: targetPeriod,
            totalEmployees: 0,
            totalGrossPay: 0,
            totalDeductions: 0,
            totalNetPay: 0,
            averageGrossPay: 0,
            averageDeductions: 0,
            averageNetPay: 0,
            statusCounts: {
              draft: 0,
              approved: 0,
              paid: 0,
              cancelled: 0
            }
          });

          // 计算平均值
          if (stats.totalEmployees > 0) {
            stats.averageGrossPay = stats.totalGrossPay / stats.totalEmployees;
            stats.averageDeductions = stats.totalDeductions / stats.totalEmployees;
            stats.averageNetPay = stats.totalNetPay / stats.totalEmployees;
          }

          return stats as PayrollStatistics;
        }

        return data;
      },
      staleTime: 5 * 60 * 1000 // 5分钟缓存
    });
  };

  // 获取部门薪资统计
  const useDepartmentStatistics = (period?: string) => {
    const targetPeriod = period || selectedPeriod;
    
    return useQuery({
      queryKey: analyticsQueryKeys.departments(targetPeriod),
      queryFn: async (): Promise<DepartmentStatistics[]> => {
        const { data, error } = await supabase
          .from('view_department_payroll_statistics')
          .select('*')
          .eq('pay_month_string', targetPeriod)
          .order('total_gross_pay', { ascending: false });

        if (error) {
          handleError(error, { customMessage: '获取部门统计失败' });
          throw error;
        }

        // 计算总额用于百分比
        const total = (data || []).reduce((sum, dept) => sum + (dept.total_gross_pay || 0), 0);

        return (data || []).map(dept => ({
          departmentId: dept.department_id || '',
          departmentName: dept.department_name || '未分配',
          employeeCount: dept.employee_count || 0,
          totalGrossPay: dept.total_gross_pay || 0,
          totalDeductions: dept.total_deductions || 0,
          totalNetPay: dept.total_net_pay || 0,
          averageGrossPay: dept.avg_gross_pay || 0,
          averageNetPay: dept.avg_net_pay || 0,
          percentOfTotal: total > 0 ? ((dept.total_gross_pay || 0) / total) * 100 : 0
        }));
      },
      staleTime: 10 * 60 * 1000 // 10分钟缓存
    });
  };

  // 获取薪资趋势数据
  const usePayrollTrends = (params: {
    startPeriod: string;
    endPeriod: string;
    groupBy?: 'month' | 'quarter' | 'year';
  }) => {
    return useQuery({
      queryKey: analyticsQueryKeys.trends(params),
      queryFn: async (): Promise<PayrollTrend[]> => {
        const { data, error } = await supabase
          .from('view_payroll_trend_unified')
          .select('*')
          .gte('pay_month', params.startPeriod)
          .lte('pay_month', params.endPeriod)
          .order('pay_year', { ascending: true })
          .order('pay_month_number', { ascending: true });

        if (error) {
          handleError(error, { customMessage: '获取趋势数据失败' });
          throw error;
        }

        // 计算增长率和同比
        const trends: PayrollTrend[] = [];
        let previousTotal = 0;
        
        for (let i = 0; i < (data || []).length; i++) {
          const current = data![i];
          const yearAgoIndex = i >= 12 ? i - 12 : -1;
          const yearAgoData = yearAgoIndex >= 0 ? data![yearAgoIndex] : null;
          
          const trend: PayrollTrend = {
            period: current.pay_month || '',
            year: current.period_year || new Date().getFullYear(),
            month: current.period_month || 1,
            totalGrossPay: current.total_gross_pay || 0,
            totalDeductions: current.total_deductions || 0,
            totalNetPay: current.total_net_pay || 0,
            employeeCount: current.employee_count || 0,
            growthRate: 0,
            yearOverYear: 0
          };
          
          // 计算环比增长率
          if (previousTotal > 0) {
            trend.growthRate = ((trend.totalGrossPay - previousTotal) / previousTotal) * 100;
          }
          
          // 计算同比增长率
          if (yearAgoData && yearAgoData.total_gross_pay && yearAgoData.total_gross_pay > 0) {
            trend.yearOverYear = 
              ((trend.totalGrossPay - (yearAgoData.total_gross_pay || 0)) / (yearAgoData.total_gross_pay || 1)) * 100;
          }
          
          previousTotal = trend.totalGrossPay;
          trends.push(trend);
        }

        return trends;
      },
      staleTime: 30 * 60 * 1000 // 30分钟缓存
    });
  };

  // 获取薪资成分分析
  const useComponentAnalysis = (period?: string) => {
    const targetPeriod = period || selectedPeriod;
    
    return useQuery({
      queryKey: analyticsQueryKeys.components(targetPeriod),
      queryFn: async (): Promise<ComponentAnalysis[]> => {
        const { data, error } = await (supabase as any).rpc('analyze_payroll_components', {
          p_period: targetPeriod
        });

        if (error) {
          // 如果RPC不存在，使用视图查询
          const { data: viewData, error: viewError } = await supabase
            .from('view_payroll_unified')
            .select('*')
            .eq('pay_month', targetPeriod)
            .not('component_id', 'is', null);

          if (viewError) {
            handleError(viewError, { customMessage: '获取成分分析失败' });
            throw viewError;
          }

          // 按组件聚合
          const componentMap = new Map<string, ComponentAnalysis>();
          
          (viewData || []).forEach(item => {
            const key = item.component_id!;
            
            if (!componentMap.has(key)) {
              componentMap.set(key, {
                componentId: item.component_id!,
                componentName: item.component_name || '',
                componentType: item.component_type as 'earning' | 'deduction',
                totalAmount: 0,
                averageAmount: 0,
                employeeCount: 0,
                percentOfTotal: 0
              });
            }
            
            const component = componentMap.get(key)!;
            component.totalAmount += item.amount || 0;
            component.employeeCount++;
          });

          // 计算平均值和百分比
          const components = Array.from(componentMap.values());
          const total = components.reduce((sum, c) => sum + c.totalAmount, 0);
          
          components.forEach(component => {
            component.averageAmount = component.employeeCount > 0 
              ? component.totalAmount / component.employeeCount 
              : 0;
            component.percentOfTotal = total > 0 
              ? (component.totalAmount / total) * 100 
              : 0;
          });

          return components.sort((a, b) => b.totalAmount - a.totalAmount) as ComponentAnalysis[];
        }

        return (data || []) as ComponentAnalysis[];
      },
      staleTime: 15 * 60 * 1000 // 15分钟缓存
    });
  };

  // 薪资对比分析
  const useComparison = (params: ComparisonParams) => {
    return useQuery({
      queryKey: analyticsQueryKeys.comparison(params),
      queryFn: async (): Promise<ComparisonResult[]> => {
        // 获取两个周期的数据
        const [baseData, compareData] = await Promise.all([
          supabase
            .from('view_payroll_summary')
            .select('*')
            .eq('pay_month', params.basePeriod),
          supabase
            .from('view_payroll_summary')
            .select('*')
            .eq('pay_month', params.comparePeriod)
        ]);

        if (baseData.error) {
          handleError(baseData.error, { customMessage: '获取基准期数据失败' });
          throw baseData.error;
        }

        if (compareData.error) {
          handleError(compareData.error, { customMessage: '获取对比期数据失败' });
          throw compareData.error;
        }

        // 聚合计算
        const baseStats = aggregatePayrollData(baseData.data || []);
        const compareStats = aggregatePayrollData(compareData.data || []);

        // 生成对比结果
        const metrics = [
          { key: 'totalEmployees', name: '员工人数' },
          { key: 'totalGrossPay', name: '应发工资总额' },
          { key: 'totalDeductions', name: '扣款总额' },
          { key: 'totalNetPay', name: '实发工资总额' },
          { key: 'averageGrossPay', name: '人均应发工资' },
          { key: 'averageNetPay', name: '人均实发工资' }
        ];

        return metrics.map(metric => {
          const baseValue = baseStats[metric.key as keyof typeof baseStats] || 0;
          const compareValue = compareStats[metric.key as keyof typeof compareStats] || 0;
          const difference = compareValue - baseValue;
          const percentageChange = baseValue > 0 ? (difference / baseValue) * 100 : 0;
          
          return {
            metric: metric.name,
            basePeriodValue: baseValue,
            comparePeriodValue: compareValue,
            difference,
            percentageChange,
            trend: difference > 0 ? 'up' : difference < 0 ? 'down' : 'stable'
          };
        });
      },
      staleTime: 20 * 60 * 1000 // 20分钟缓存
    });
  };

  // 生成报表
  const generateReport = async (config: ReportConfig) => {
    try {
      const { data, error } = await (supabase as any).rpc('generate_payroll_report', {
        p_report_type: config.type,
        p_period_start: config.periodStart,
        p_period_end: config.periodEnd,
        p_department_ids: config.departmentIds || null,
        p_group_by: config.groupBy || null
      });

      if (error) {
        handleError(error, { customMessage: '生成报表失败' });
        throw error;
      }

      return data;
    } catch (error) {
      handleError(error, { customMessage: '生成报表失败' });
      throw error;
    }
  };

  // 导出报表为Excel
  const exportToExcel = async (data: any[], filename: string) => {
    // 这里可以集成Excel导出库
    console.log('Export to Excel:', filename, data);
    // 实际实现需要使用xlsx或其他Excel库
  };

  // 辅助函数：聚合薪资数据
  const aggregatePayrollData = (data: any[]) => {
    const stats = data.reduce((acc, item) => {
      acc.totalEmployees++;
      acc.totalGrossPay += item.gross_pay || 0;
      acc.totalDeductions += item.total_deductions || 0;
      acc.totalNetPay += item.net_pay || 0;
      return acc;
    }, {
      totalEmployees: 0,
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      averageGrossPay: 0,
      averageNetPay: 0
    });

    if (stats.totalEmployees > 0) {
      stats.averageGrossPay = stats.totalGrossPay / stats.totalEmployees;
      stats.averageNetPay = stats.totalNetPay / stats.totalEmployees;
    }

    return stats;
  };

  // 刷新所有分析数据
  const refreshAnalytics = async () => {
    await queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all });
  };

  return {
    // 当前选中周期
    selectedPeriod,
    setSelectedPeriod,

    // 查询
    queries: {
      usePayrollStatistics,
      useDepartmentStatistics,
      usePayrollTrends,
      useComponentAnalysis,
      useComparison
    },

    // 操作
    actions: {
      generateReport,
      exportToExcel,
      refreshAnalytics
    },

    // 工具函数
    utils: {
      // 格式化货币
      formatCurrency: (amount: number) => {
        return new Intl.NumberFormat('zh-CN', {
          style: 'currency',
          currency: 'CNY'
        }).format(amount);
      },

      // 格式化百分比
      formatPercentage: (value: number) => {
        return `${value.toFixed(2)}%`;
      },

      // 获取趋势图标
      getTrendIcon: (trend: 'up' | 'down' | 'stable') => {
        const icons = {
          up: '↑',
          down: '↓',
          stable: '→'
        };
        return icons[trend];
      },

      // 获取状态颜色
      getStatusColor: (status: string) => {
        const colors = {
          draft: '#808080',
          approved: '#1890ff',
          paid: '#52c41a',
          cancelled: '#f5222d'
        };
        return colors[status as keyof typeof colors] || '#000000';
      },

      // 聚合数据
      aggregatePayrollData
    }
  };
}