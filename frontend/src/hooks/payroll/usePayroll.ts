import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PayrollService,
  PayrollStatus,
  type PayrollStatusType
} from '@/services/payroll.service';

// 查询键常量
const PAYROLL_KEYS = {
  all: ['payrolls'] as const,
  lists: () => [...PAYROLL_KEYS.all, 'list'] as const,
  list: (filters?: any) => [...PAYROLL_KEYS.lists(), filters] as const,
  detail: (id: string) => [...PAYROLL_KEYS.all, 'detail', id] as const,
  statistics: (params: any) => [...PAYROLL_KEYS.all, 'statistics', params] as const,
  costAnalysis: (params: any) => [...PAYROLL_KEYS.all, 'cost-analysis', params] as const,
};

// 获取最近有薪资记录的月份
export const useLatestPayrollMonth = () => {
  return useQuery({
    queryKey: [...PAYROLL_KEYS.all, 'latest-month'] as const,
    queryFn: () => PayrollService.getLatestPayrollMonth(),
    staleTime: 10 * 60 * 1000, // 10分钟
  });
};

// 获取薪资列表
export const usePayrolls = (filters?: {
  status?: PayrollStatusType;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) => {
  return useQuery({
    queryKey: PAYROLL_KEYS.list(filters),
    queryFn: () => PayrollService.getPayrolls(filters),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

// 获取薪资详情
export const usePayrollDetails = (payrollId: string) => {
  return useQuery({
    queryKey: PAYROLL_KEYS.detail(payrollId),
    queryFn: () => PayrollService.getPayrollDetails(payrollId),
    enabled: !!payrollId,
    staleTime: 5 * 60 * 1000,
  });
};

// 获取薪资统计（按参数查询）
export const usePayrollStatisticsByParams = (params: {
  year: number;
  month?: number;
  departmentId?: string;
}) => {
  return useQuery({
    queryKey: PAYROLL_KEYS.statistics(params),
    queryFn: () => PayrollService.getPayrollStatistics(params),
    staleTime: 10 * 60 * 1000, // 10分钟
  });
};

// 获取成本分析
export const useCostAnalysis = (params: {
  startMonth: string;
  endMonth: string;
}) => {
  return useQuery({
    queryKey: PAYROLL_KEYS.costAnalysis(params),
    queryFn: () => PayrollService.getCostAnalysis(params),
    staleTime: 10 * 60 * 1000,
  });
};

// 创建薪资记录
export const useCreatePayroll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PayrollService.createPayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.lists() });
    },
  });
};

// 批量创建薪资记录
export const useCreateBatchPayrolls = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PayrollService.createBatchPayrolls,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.lists() });
    },
  });
};

// 更新薪资状态
export const useUpdatePayrollStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payrollId, status, notes }: {
      payrollId: string;
      status: PayrollStatusType;
      notes?: string;
    }) => PayrollService.updatePayrollStatus(payrollId, status, notes),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.detail(variables.payrollId) });
    },
  });
};

// 批量更新薪资状态
export const useUpdateBatchPayrollStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payrollIds, status }: {
      payrollIds: string[];
      status: PayrollStatusType;
    }) => PayrollService.updateBatchPayrollStatus(payrollIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.lists() });
    },
  });
};

// 计算薪资
export const useCalculatePayrolls = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payrollIds: string[]) => PayrollService.calculatePayrolls(payrollIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.all });
    },
  });
};

// 删除薪资记录
export const useDeletePayroll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PayrollService.deletePayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEYS.lists() });
    },
  });
};