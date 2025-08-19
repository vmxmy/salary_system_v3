import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 薪资分类枚举
export const SalaryCategories = {
  // 收入项分类
  BASIC_SALARY: 'basic_salary',
  BENEFITS: 'benefits',
  // 扣除项分类
  PERSONAL_INSURANCE: 'personal_insurance',
  EMPLOYER_INSURANCE: 'employer_insurance', 
  PERSONAL_TAX: 'personal_tax',
  OTHER_DEDUCTIONS: 'other_deductions'
} as const;

export type SalaryCategoryType = typeof SalaryCategories[keyof typeof SalaryCategories];

// 类型定义
type SalaryComponent = Database['public']['Tables']['salary_components']['Row'];
type SalaryComponentInsert = Database['public']['Tables']['salary_components']['Insert'];
type SalaryComponentUpdate = Database['public']['Tables']['salary_components']['Update'];

// 查询键常量
const COMPONENT_KEYS = {
  all: ['salary-components'] as const,
  lists: () => [...COMPONENT_KEYS.all, 'list'] as const,
  list: (filters?: any) => [...COMPONENT_KEYS.lists(), filters] as const,
  detail: (id: string) => [...COMPONENT_KEYS.all, 'detail', id] as const,
  categories: () => [...COMPONENT_KEYS.all, 'categories'] as const,
  
  configs: () => [...COMPONENT_KEYS.all, 'configs'] as const,
  configsList: (filters?: any) => [...COMPONENT_KEYS.configs(), 'list', filters] as const,
  employeeConfigs: (employeeId: string, date?: string) => 
    [...COMPONENT_KEYS.configs(), 'employee', employeeId, date] as const,
};

// ==================== 薪资组件相关 ====================

// 获取薪资组件列表
export const useSalaryComponents = (filters?: {
  category?: SalaryCategoryType;
  isActive?: boolean;
  type?: 'earning' | 'deduction';
}) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: COMPONENT_KEYS.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('salary_components')
        .select('*');

      // 应用过滤条件
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters?.type) {
        query = query.eq('component_type', filters.type);
      }

      query = query.order('name');

      const { data, error } = await query;

      if (error) {
        handleError(error, { customMessage: '获取薪资组件列表失败' });
        throw error;
      }
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30分钟
  });
};

// 获取所有扣除项（包含三个分类）
export const useDeductionComponents = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: COMPONENT_KEYS.list({ type: 'deduction' }),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_components')
        .select('*')
        .eq('component_type', 'deduction')
        .eq('is_active', true)
        .order('name');

      if (error) {
        handleError(error, { customMessage: '获取扣除项组件失败' });
        throw error;
      }
      return data || [];
    },
    staleTime: 30 * 60 * 1000,
  });
};

// 获取薪资组件分类
export const useSalaryComponentCategories = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: COMPONENT_KEYS.categories(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_components')
        .select('category')
        .not('category', 'is', null);

      if (error) {
        handleError(error, { customMessage: '获取薪资组件分类失败' });
        throw error;
      }
      
      // 返回唯一的分类列表
      const categories = [...new Set((data || []).map(item => item.category))];
      return categories.filter(Boolean);
    },
    staleTime: 60 * 60 * 1000, // 1小时
  });
};

// ==================== 导出常量 ====================
export {
  COMPONENT_KEYS,
  SalaryCategories as default
};

// TODO: 以下功能需要重新实现
// - useSalaryComponent (单个组件详情)
// - useCreateSalaryComponent (创建组件)
// - useUpdateSalaryComponent (更新组件)
// - useToggleComponentStatus (切换状态)
// - useUpdateComponentOrders (更新排序)
// - useEmployeePayrollConfigs (员工薪资配置)
// - useEmployeeActiveConfigs (员工活跃配置)
// - useCreateEmployeePayrollConfig (创建员工配置)
// - useBatchCreateEmployeeConfigs (批量创建)
// - useUpdateEmployeePayrollConfig (更新员工配置)
// - useEndEmployeePayrollConfig (结束配置)
// - useCopyEmployeeConfigs (复制配置)
// - useCreatePayrollTemplate (创建模板)
// - useApplyTemplateToEmployees (应用模板)