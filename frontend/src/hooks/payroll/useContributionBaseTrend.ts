import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';

/**
 * 缴费基数趋势数据结构
 */
export interface ContributionBaseTrendData {
  month: string;           // YYYY-MM 格式
  monthDisplay: string;    // YYYY年MM月 格式
  baseAmount: number;      // 缴费基数金额
  employeeAmount: number;  // 员工缴费金额
  employerAmount: number;  // 单位缴费金额
  totalAmount: number;     // 总缴费金额
}

/**
 * 缴费基数趋势查询键管理
 */
export const contributionBaseTrendQueryKeys = {
  all: ['contributionBaseTrend'] as const,
  employee: (employeeId: string, insuranceType: string, year: number) => 
    [...contributionBaseTrendQueryKeys.all, 'employee', employeeId, insuranceType, year] as const,
};

/**
 * 获取员工特定保险类型的年度缴费基数趋势
 */
export function useEmployeeContributionBaseTrend(
  employeeId: string, 
  insuranceTypeKey: string = 'housing_fund', // 默认住房公积金
  year?: number
) {
  const { handleError } = useErrorHandler();
  const targetYear = year ?? new Date().getFullYear();
  
  return useQuery({
    queryKey: contributionBaseTrendQueryKeys.employee(employeeId, insuranceTypeKey, targetYear),
    queryFn: async (): Promise<ContributionBaseTrendData[]> => {
      // 查询员工在指定年度的缴费基数历史数据
      const { data: contributionData, error } = await supabase
        .from('view_employee_contribution_bases_by_period')
        .select(`
          base_period_year,
          base_period_month,
          base_period_display,
          latest_contribution_base,
          employee_rate,
          employer_rate,
          insurance_type_key,
          insurance_type_name
        `)
        .eq('employee_id', employeeId)
        .eq('insurance_type_key', insuranceTypeKey)
        .eq('base_period_year', targetYear)
        .order('base_period_month');
      
      if (error) {
        handleError(error, { customMessage: '获取缴费基数趋势失败' });
        throw error;
      }
      
      // 创建月度数据映射，初始化今年所有月份
      const monthlyData = new Map<string, ContributionBaseTrendData>();
      const currentDate = new Date();
      const currentMonth = currentDate.getFullYear() === targetYear ? currentDate.getMonth() + 1 : 12;
      
      // 初始化所有月份（从1月到当前月份）
      for (let month = 1; month <= currentMonth; month++) {
        const monthKey = `${targetYear}-${month.toString().padStart(2, '0')}`;
        const monthDisplay = `${targetYear}年${month}月`;
        
        monthlyData.set(monthKey, {
          month: monthKey,
          monthDisplay,
          baseAmount: 0,
          employeeAmount: 0,
          employerAmount: 0,
          totalAmount: 0,
        });
      }
      
      // 填充实际数据
      (contributionData || []).forEach((record: any) => {
        const monthKey = `${record.base_period_year}-${record.base_period_month.toString().padStart(2, '0')}`;
        const existingData = monthlyData.get(monthKey);
        
        if (existingData) {
          const baseAmount = record.latest_contribution_base || 0;
          const employeeRate = record.employee_rate || 0;
          const employerRate = record.employer_rate || 0;
          const employeeAmount = baseAmount * employeeRate;
          const employerAmount = baseAmount * employerRate;
          
          existingData.baseAmount = baseAmount;
          existingData.employeeAmount = employeeAmount;
          existingData.employerAmount = employerAmount;
          existingData.totalAmount = employeeAmount + employerAmount;
        }
      });
      
      // 转换为数组并排序
      return Array.from(monthlyData.values())
        .sort((a, b) => a.month.localeCompare(b.month));
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    gcTime: 10 * 60 * 1000,   // 10分钟垃圾回收
  });
}

/**
 * 获取公积金缴费基数趋势的便捷Hook
 */
export function useProvidentFundBaseTrend(employeeId: string, year?: number) {
  return useEmployeeContributionBaseTrend(employeeId, 'housing_fund', year);
}

/**
 * 获取当前年度公积金缴费基数趋势的便捷Hook
 */
export function useCurrentYearProvidentFundTrend(employeeId: string) {
  return useProvidentFundBaseTrend(employeeId);
}