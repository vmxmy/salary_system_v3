import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  InsuranceBaseService,
  type BaseStrategyType,
  type BaseAdjustmentConfig,
  type EmployeeBaseData
} from '@/services/insurance-base.service';

/**
 * 获取员工当前基数信息
 */
export function useCurrentBases(employeeIds: string[], yearMonth?: string) {
  return useQuery({
    queryKey: ['insurance-bases', 'current', employeeIds, yearMonth],
    queryFn: () => InsuranceBaseService.getCurrentBases(employeeIds, yearMonth),
    enabled: employeeIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    refetchOnWindowFocus: false,
  });
}

/**
 * 获取保险类型列表
 */
export function useInsuranceTypes() {
  return useQuery({
    queryKey: ['insurance-types'],
    queryFn: () => InsuranceBaseService.getInsuranceTypes(),
    staleTime: 30 * 60 * 1000, // 30分钟缓存
    refetchOnWindowFocus: false,
  });
}

/**
 * 复制基数操作
 */
export function useCopyBases() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sourceMonth, targetMonth, employeeIds }: {
      sourceMonth: string;
      targetMonth: string;
      employeeIds?: string[];
    }) => InsuranceBaseService.copyBases(sourceMonth, targetMonth, employeeIds),
    onSuccess: () => {
      // 清除相关缓存
      queryClient.invalidateQueries({ queryKey: ['insurance-bases'] });
    },
  });
}

/**
 * 创建新基数操作
 */
export function useCreateNewBases() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (employeeBaseData: EmployeeBaseData[]) => 
      InsuranceBaseService.createNewBases(employeeBaseData),
    onSuccess: () => {
      // 清除相关缓存
      queryClient.invalidateQueries({ queryKey: ['insurance-bases'] });
      queryClient.invalidateQueries({ queryKey: ['available-payroll-months'] });
    },
  });
}

/**
 * 批量调整基数计算
 */
export function useBatchAdjustment() {
  return useMutation({
    mutationFn: ({ employeeIds, adjustmentConfig, effectiveDate }: {
      employeeIds: string[];
      adjustmentConfig: BaseAdjustmentConfig;
      effectiveDate: string;
    }) => InsuranceBaseService.applyBatchAdjustment(employeeIds, adjustmentConfig, effectiveDate),
  });
}

/**
 * 基数调整影响预览
 */
export function useAdjustmentImpact(
  employeeIds: string[],
  adjustmentConfig: BaseAdjustmentConfig | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['insurance-bases', 'impact', employeeIds, adjustmentConfig],
    queryFn: () => {
      if (!adjustmentConfig) throw new Error('调整配置不能为空');
      return InsuranceBaseService.calculateAdjustmentImpact(employeeIds, adjustmentConfig);
    },
    enabled: enabled && employeeIds.length > 0 && !!adjustmentConfig,
    staleTime: 1 * 60 * 1000, // 1分钟缓存
  });
}

/**
 * 基数数据验证
 */
export function useValidateBaseData() {
  return useMutation({
    mutationFn: async (employeeBaseData: EmployeeBaseData[]) => {
      const errors = InsuranceBaseService.validateBaseData(employeeBaseData);
      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }
      return { valid: true, errors: [] };
    },
  });
}