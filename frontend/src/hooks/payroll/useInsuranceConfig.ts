import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InsuranceConfigService } from '@/services/insurance-config.service';

// 查询键常量
const INSURANCE_KEYS = {
  all: ['insurance'] as const,
  types: () => [...INSURANCE_KEYS.all, 'types'] as const,
  type: (id: string) => [...INSURANCE_KEYS.types(), id] as const,
  
  bases: () => [...INSURANCE_KEYS.all, 'bases'] as const,
  basesList: (filters?: any) => [...INSURANCE_KEYS.bases(), 'list', filters] as const,
  monthlyBases: (params: any) => [...INSURANCE_KEYS.bases(), 'monthly', params] as const,
  baseSummary: (yearMonth: string) => [...INSURANCE_KEYS.bases(), 'summary', yearMonth] as const,
  
  policies: () => [...INSURANCE_KEYS.all, 'policies'] as const,
  policiesList: (filters?: any) => [...INSURANCE_KEYS.policies(), 'list', filters] as const,
  policy: (id: string) => [...INSURANCE_KEYS.policies(), id] as const,
  
  applicablePolicies: (employeeId: string, date: string) => 
    [...INSURANCE_KEYS.all, 'applicable', employeeId, date] as const,
  calculationLogs: (filters?: any) => [...INSURANCE_KEYS.all, 'logs', filters] as const,
};

// ==================== 保险类型相关 ====================

// 获取保险类型列表
export const useInsuranceTypes = () => {
  return useQuery({
    queryKey: INSURANCE_KEYS.types(),
    queryFn: InsuranceConfigService.getInsuranceTypes,
    staleTime: 30 * 60 * 1000, // 30分钟
  });
};

// 获取单个保险类型
export const useInsuranceType = (id: string) => {
  return useQuery({
    queryKey: INSURANCE_KEYS.type(id),
    queryFn: () => InsuranceConfigService.getInsuranceType(id),
    enabled: !!id,
  });
};

// 创建保险类型
export const useCreateInsuranceType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: InsuranceConfigService.createInsuranceType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.types() });
    },
  });
};

// 更新保险类型
export const useUpdateInsuranceType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      InsuranceConfigService.updateInsuranceType(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.types() });
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.type(variables.id) });
    },
  });
};

// ==================== 缴费基数相关 ====================

// 获取员工缴费基数列表
export const useEmployeeContributionBases = (filters?: {
  employeeId?: string;
  insuranceTypeId?: string;
  effectiveDate?: string;
}) => {
  return useQuery({
    queryKey: INSURANCE_KEYS.basesList(filters),
    queryFn: () => InsuranceConfigService.getEmployeeContributionBases(filters),
    staleTime: 5 * 60 * 1000,
  });
};

// 获取月度缴费基数
export const useMonthlyInsuranceBases = (params: {
  employeeIds?: string[];
  yearMonth?: string;
}) => {
  return useQuery({
    queryKey: INSURANCE_KEYS.monthlyBases(params),
    queryFn: () => InsuranceConfigService.getMonthlyInsuranceBases(params),
    staleTime: 5 * 60 * 1000,
  });
};

// 获取缴费基数汇总
export const useInsuranceBaseSummary = (yearMonth: string) => {
  return useQuery({
    queryKey: INSURANCE_KEYS.baseSummary(yearMonth),
    queryFn: () => InsuranceConfigService.getInsuranceBaseSummary(yearMonth),
    enabled: !!yearMonth,
    staleTime: 10 * 60 * 1000,
  });
};

// 创建缴费基数
export const useCreateContributionBase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: InsuranceConfigService.createContributionBase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.bases() });
    },
  });
};

// 批量创建缴费基数
export const useCreateBatchContributionBases = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeIds, baseData }: {
      employeeIds: string[];
      baseData: any;
    }) => InsuranceConfigService.createBatchContributionBases(employeeIds, baseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.bases() });
    },
  });
};

// 更新缴费基数
export const useUpdateContributionBase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      InsuranceConfigService.updateContributionBase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.bases() });
    },
  });
};

// 结束缴费基数
export const useEndContributionBase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) =>
      InsuranceConfigService.endContributionBase(id, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.bases() });
    },
  });
};

// ==================== 社保政策相关 ====================

// 获取社保政策列表
export const useSocialInsurancePolicies = (filters?: {
  insuranceTypeId?: string;
  isActive?: boolean;
}) => {
  return useQuery({
    queryKey: INSURANCE_KEYS.policiesList(filters),
    queryFn: () => InsuranceConfigService.getSocialInsurancePolicies(filters),
    staleTime: 10 * 60 * 1000,
  });
};

// 获取单个社保政策
export const useSocialInsurancePolicy = (id: string) => {
  return useQuery({
    queryKey: INSURANCE_KEYS.policy(id),
    queryFn: () => InsuranceConfigService.getSocialInsurancePolicy(id),
    enabled: !!id,
  });
};

// 创建社保政策
export const useCreateSocialInsurancePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, applicableCategoryIds }: {
      data: any;
      applicableCategoryIds?: string[];
    }) => InsuranceConfigService.createSocialInsurancePolicy(data, applicableCategoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.policies() });
    },
  });
};

// 更新社保政策
export const useUpdateSocialInsurancePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, applicableCategoryIds }: {
      id: string;
      data: any;
      applicableCategoryIds?: string[];
    }) => InsuranceConfigService.updateSocialInsurancePolicy(id, data, applicableCategoryIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.policies() });
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.policy(variables.id) });
    },
  });
};

// 切换政策状态
export const useTogglePolicyStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      InsuranceConfigService.togglePolicyStatus(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.policies() });
      queryClient.invalidateQueries({ queryKey: INSURANCE_KEYS.policy(variables.id) });
    },
  });
};

// ==================== 计算相关 ====================

// 获取员工适用的保险政策
export const useApplicablePolicies = (employeeId: string, effectiveDate: string) => {
  return useQuery({
    queryKey: INSURANCE_KEYS.applicablePolicies(employeeId, effectiveDate),
    queryFn: () => InsuranceConfigService.getApplicablePolicies(employeeId, effectiveDate),
    enabled: !!employeeId && !!effectiveDate,
  });
};

// 获取保险计算日志
export const useInsuranceCalculationLogs = (filters?: {
  employeeId?: string;
  payrollId?: string;
  yearMonth?: string;
}) => {
  return useQuery({
    queryKey: INSURANCE_KEYS.calculationLogs(filters),
    queryFn: () => InsuranceConfigService.getInsuranceCalculationLogs(filters),
    staleTime: 5 * 60 * 1000,
  });
};