import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SalaryComponentsService,
  SalaryCategories,
  type SalaryCategoryType
} from '@/services/salary-components.service';

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
  return useQuery({
    queryKey: COMPONENT_KEYS.list(filters),
    queryFn: () => SalaryComponentsService.getSalaryComponents(filters),
    staleTime: 30 * 60 * 1000, // 30分钟
  });
};

// 获取所有扣除项（包含三个分类）
export const useDeductionComponents = () => {
  return useQuery({
    queryKey: [...COMPONENT_KEYS.lists(), 'deductions'],
    queryFn: async () => {
      const components = await SalaryComponentsService.getSalaryComponents({
        type: 'deduction'
      });
      
      // 按分类组织扣除项
      const grouped = {
        personal_insurance: [] as any[],  // 员工扣除项（个人五险一金）
        employer_insurance: [] as any[],  // 雇主扣除项（单位五险一金）
        personal_tax: [] as any[],        // 个人所得税
        other_deductions: [] as any[]     // 其他扣除项
      };
      
      components.forEach(comp => {
        if (comp.category && grouped[comp.category as keyof typeof grouped]) {
          grouped[comp.category as keyof typeof grouped].push(comp);
        }
      });
      
      return {
        all: components,
        grouped,
        // 便捷访问
        personalInsurance: grouped.personal_insurance,
        employerInsurance: grouped.employer_insurance,
        personalTax: grouped.personal_tax,
        otherDeductions: grouped.other_deductions
      };
    },
    staleTime: 30 * 60 * 1000,
  });
};

// 获取收入项
export const useSalaryEarningComponents = () => {
  return useQuery({
    queryKey: [...COMPONENT_KEYS.lists(), 'earnings'],
    queryFn: async () => {
      const components = await SalaryComponentsService.getSalaryComponents({
        type: 'earning'
      });
      
      // 按分类组织收入项
      const grouped = {
        basic_salary: [] as any[],  // 基本薪酬
        benefits: [] as any[]        // 福利津贴
      };
      
      components.forEach(comp => {
        if (comp.category && grouped[comp.category as keyof typeof grouped]) {
          grouped[comp.category as keyof typeof grouped].push(comp);
        }
      });
      
      return {
        all: components,
        grouped,
        // 便捷访问
        basicSalary: grouped.basic_salary,
        benefits: grouped.benefits
      };
    },
    staleTime: 30 * 60 * 1000,
  });
};

// 获取薪资组件分类统计
export const useSalaryComponentCategories = () => {
  return useQuery({
    queryKey: COMPONENT_KEYS.categories(),
    queryFn: SalaryComponentsService.getSalaryComponentCategories,
    staleTime: 60 * 60 * 1000, // 1小时
  });
};

// 获取单个薪资组件
export const useSalaryComponent = (id: string) => {
  return useQuery({
    queryKey: COMPONENT_KEYS.detail(id),
    queryFn: () => SalaryComponentsService.getSalaryComponent(id),
    enabled: !!id,
  });
};

// 创建薪资组件
export const useCreateSalaryComponent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: SalaryComponentsService.createSalaryComponent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.categories() });
    },
  });
};

// 更新薪资组件
export const useUpdateSalaryComponent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      SalaryComponentsService.updateSalaryComponent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.categories() });
    },
  });
};

// 切换组件状态
export const useToggleComponentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      SalaryComponentsService.toggleComponentStatus(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.detail(variables.id) });
    },
  });
};

// 批量更新组件顺序
export const useUpdateComponentOrders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ id: string; display_order: number }>) =>
      SalaryComponentsService.updateComponentOrders(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.lists() });
    },
  });
};

// ==================== 员工薪资配置相关 ====================

// 获取员工薪资配置列表
export const useEmployeePayrollConfigs = (filters?: {
  employeeId?: string;
  componentId?: string;
  effectiveDate?: string;
}) => {
  return useQuery({
    queryKey: COMPONENT_KEYS.configsList(filters),
    queryFn: () => SalaryComponentsService.getEmployeePayrollConfigs(filters),
    staleTime: 5 * 60 * 1000,
  });
};

// 获取员工当前生效的薪资配置
export const useEmployeeActiveConfigs = (employeeId: string, effectiveDate?: string) => {
  return useQuery({
    queryKey: COMPONENT_KEYS.employeeConfigs(employeeId, effectiveDate),
    queryFn: () => SalaryComponentsService.getEmployeeActiveConfigs(employeeId, effectiveDate),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};

// 创建员工薪资配置
export const useCreateEmployeePayrollConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: SalaryComponentsService.createEmployeePayrollConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.configs() });
    },
  });
};

// 批量创建员工薪资配置
export const useCreateBatchEmployeeConfigs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeIds, configs }: {
      employeeIds: string[];
      configs: Array<any>;
    }) => SalaryComponentsService.createBatchEmployeeConfigs(employeeIds, configs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.configs() });
    },
  });
};

// 更新员工薪资配置
export const useUpdateEmployeePayrollConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      SalaryComponentsService.updateEmployeePayrollConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.configs() });
    },
  });
};

// 结束员工薪资配置
export const useEndEmployeePayrollConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) =>
      SalaryComponentsService.endEmployeePayrollConfig(id, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.configs() });
    },
  });
};

// 复制员工薪资配置
export const useCopyEmployeeConfigs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceEmployeeId, targetEmployeeIds, effectiveFrom }: {
      sourceEmployeeId: string;
      targetEmployeeIds: string[];
      effectiveFrom: string;
    }) => SalaryComponentsService.copyEmployeeConfigs(
      sourceEmployeeId,
      targetEmployeeIds,
      effectiveFrom
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.configs() });
    },
  });
};

// ==================== 模板管理相关 ====================

// 创建薪资配置模板
export const useCreatePayrollTemplate = () => {
  return useMutation({
    mutationFn: ({ name, description, configs }: {
      name: string;
      description: string;
      configs: Array<{ component_id: string; amount: number }>;
    }) => SalaryComponentsService.createPayrollTemplate(name, description, configs),
  });
};

// 应用薪资模板到员工
export const useApplyTemplateToEmployees = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, employeeIds, effectiveFrom }: {
      templateId: string;
      employeeIds: string[];
      effectiveFrom: string;
    }) => SalaryComponentsService.applyTemplateToEmployees(
      templateId,
      employeeIds,
      effectiveFrom
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPONENT_KEYS.configs() });
    },
  });
};