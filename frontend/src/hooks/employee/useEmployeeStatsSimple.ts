import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface SimpleEmployeeStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  departments: number;
}

/**
 * 简化的员工统计Hook
 * 专门用于指标卡显示，直接查询数据库获取准确的统计数据
 * 不受表格分页限制影响
 */
export function useEmployeeStatsSimple() {
  return useQuery({
    queryKey: ['employee-stats-simple'],
    queryFn: async (): Promise<SimpleEmployeeStats> => {
      // 1. 获取所有活跃员工的状态统计
      const { data: employeeStats, error: employeeError } = await supabase
        .from('employees')
        .select('employment_status')
        .is('deleted_at', null); // 排除软删除的员工

      if (employeeError) {
        console.error('Failed to fetch employee statistics:', employeeError);
        throw employeeError;
      }

      // 2. 获取部门数量（departments表没有is_active字段）
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id');

      if (deptError) {
        console.error('Failed to fetch department count:', deptError);
        throw deptError;
      }

      // 3. 计算统计数据
      const stats: SimpleEmployeeStats = {
        total: employeeStats.length,
        active: employeeStats.filter(emp => emp.employment_status === 'active').length,
        inactive: employeeStats.filter(emp => emp.employment_status === 'inactive').length,
        suspended: employeeStats.filter(emp => emp.employment_status === 'suspended').length,
        departments: departments.length,
      };

      console.log('Simple employee stats calculated:', stats);
      return stats;
    },
    staleTime: 2 * 60 * 1000, // 2分钟缓存 - 比较短，确保数据及时性
    gcTime: 5 * 60 * 1000, // 5分钟垃圾回收
    refetchOnWindowFocus: false, // 不在窗口获得焦点时重新获取
    retry: 2, // 失败时重试2次
  });
}

/**
 * 员工统计查询键
 */
export const employeeStatsSimpleKeys = {
  all: ['employee-stats-simple'] as const,
  stats: () => [...employeeStatsSimpleKeys.all] as const,
};