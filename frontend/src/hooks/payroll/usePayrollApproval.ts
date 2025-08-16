import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/types/supabase';

// 类型定义
type Payroll = Database['public']['Tables']['payrolls']['Row'];
type PayrollUpdate = Database['public']['Tables']['payrolls']['Update'];

// 审批状态流转
export const ApprovalFlow = {
  DRAFT_TO_PENDING: { from: 'draft', to: 'pending_approval' },
  PENDING_TO_APPROVED: { from: 'pending_approval', to: 'approved' },
  APPROVED_TO_PAID: { from: 'approved', to: 'paid' },
  ANY_TO_DRAFT: { from: '*', to: 'draft' }, // 驳回
  ANY_TO_CANCELLED: { from: '*', to: 'cancelled' } // 取消
} as const;

// 审批记录类型
export interface ApprovalRecord {
  id: string;
  payroll_id: string;
  action: 'submit' | 'approve' | 'reject' | 'pay' | 'cancel';
  from_status: string;
  to_status: string;
  user_id: string;
  user_name: string;
  notes?: string;
  created_at: string;
}

// 审批参数
export interface ApprovalParams {
  payrollIds: string[];
  notes?: string;
}

// 驳回参数
export interface RejectParams {
  payrollIds: string[];
  reason: string;
}

// 批量审批结果
export interface BatchApprovalResult {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    payrollId: string;
    success: boolean;
    error?: string;
  }>;
}

// 审批流程配置
export interface ApprovalFlowConfig {
  requireNotes?: boolean;
  requireReason?: boolean;
  allowBatchApproval?: boolean;
  maxBatchSize?: number;
  autoCalculateBeforeApproval?: boolean;
}

// 查询键管理
export const approvalQueryKeys = {
  all: ['payroll-approval'] as const,
  records: (payrollId: string) => [...approvalQueryKeys.all, 'records', payrollId] as const,
  pending: () => [...approvalQueryKeys.all, 'pending'] as const,
  statistics: () => [...approvalQueryKeys.all, 'statistics'] as const,
};

/**
 * 薪资审批流程 Hook
 */
export function usePayrollApproval(config: ApprovalFlowConfig = {}) {
  const {
    requireNotes = false,
    requireReason = true,
    allowBatchApproval = true,
    maxBatchSize = 100,
    autoCalculateBeforeApproval = false
  } = config;

  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const { user } = useAuth();
  
  const [processingStatus, setProcessingStatus] = useState<{
    isProcessing: boolean;
    current: number;
    total: number;
    phase: string;
  }>({
    isProcessing: false,
    current: 0,
    total: 0,
    phase: ''
  });

  // 获取待审批的薪资列表
  const usePendingApprovals = () => {
    return useQuery({
      queryKey: approvalQueryKeys.pending(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('view_payroll_summary')
          .select('*')
          .eq('status', 'draft')
          .order('pay_period_start', { ascending: false });

        if (error) {
          handleError(error, { customMessage: '获取待审批列表失败' });
          throw error;
        }

        return data || [];
      },
      staleTime: 30 * 1000 // 30秒缓存
    });
  };

  // 获取审批记录
  const useApprovalRecords = (payrollId: string) => {
    return useQuery({
      queryKey: approvalQueryKeys.records(payrollId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('payroll_approval_logs')
          .select(`
            *,
            user:users(
              id,
              full_name,
              email
            )
          `)
          .eq('payroll_id', payrollId)
          .order('created_at', { ascending: false });

        if (error && error.code !== 'PGRST301') { // 忽略表不存在错误
          handleError(error, { customMessage: '获取审批记录失败' });
          throw error;
        }

        return (data || []) as ApprovalRecord[];
      },
      enabled: !!payrollId,
      staleTime: 5 * 60 * 1000
    });
  };

  // 验证是否可以执行审批操作
  const validateApprovalAction = async (
    payrollIds: string[],
    expectedStatus: string
  ): Promise<{ valid: boolean; invalidIds: string[]; errors: string[] }> => {
    const errors: string[] = [];
    const invalidIds: string[] = [];

    // 批量检查限制
    if (!allowBatchApproval && payrollIds.length > 1) {
      errors.push('不允许批量审批操作');
      return { valid: false, invalidIds: payrollIds, errors };
    }

    if (payrollIds.length > maxBatchSize) {
      errors.push(`批量操作数量不能超过 ${maxBatchSize} 条`);
      return { valid: false, invalidIds: payrollIds, errors };
    }

    // 检查每条记录的状态
    const { data: payrolls, error } = await supabase
      .from('payrolls')
      .select('id, status')
      .in('id', payrollIds);

    if (error) {
      errors.push('无法验证薪资状态');
      return { valid: false, invalidIds: payrollIds, errors };
    }

    payrolls?.forEach(payroll => {
      if (payroll.status !== expectedStatus) {
        invalidIds.push(payroll.id);
        errors.push(`薪资记录 ${payroll.id} 状态不正确`);
      }
    });

    return {
      valid: invalidIds.length === 0,
      invalidIds,
      errors
    };
  };

  // 记录审批日志
  const logApprovalAction = async (
    payrollId: string,
    action: ApprovalRecord['action'],
    fromStatus: string,
    toStatus: string,
    notes?: string
  ) => {
    try {
      await supabase
        .from('payroll_approval_logs')
        .insert({
          payroll_id: payrollId,
          action,
          from_status: fromStatus,
          to_status: toStatus,
          user_id: user?.id,
          user_name: user?.email || 'System',
          notes,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('记录审批日志失败:', error);
      // 日志失败不影响主流程
    }
  };

  // 提交审批
  const submitForApproval = useMutation({
    mutationFn: async (params: ApprovalParams): Promise<BatchApprovalResult> => {
      if (requireNotes && !params.notes) {
        throw new Error('请填写提交说明');
      }

      // 验证状态
      const validation = await validateApprovalAction(params.payrollIds, 'draft');
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      const results: BatchApprovalResult = {
        total: params.payrollIds.length,
        success: 0,
        failed: 0,
        results: []
      };

      setProcessingStatus({
        isProcessing: true,
        current: 0,
        total: params.payrollIds.length,
        phase: '提交审批'
      });

      // 批量处理
      for (let i = 0; i < params.payrollIds.length; i++) {
        const payrollId = params.payrollIds[i];
        
        try {
          // 如果需要，先执行计算
          if (autoCalculateBeforeApproval) {
            await supabase.rpc('generate_payroll_items', {
              p_payroll_id: payrollId,
              p_period_id: null // 会自动获取
            });
          }

          // 更新状态
          const { error } = await supabase
            .from('payrolls')
            .update({
              status: 'approved', // 直接设为已审批（根据实际需求调整）
              updated_at: new Date().toISOString()
            })
            .eq('id', payrollId);

          if (error) throw error;

          // 记录日志
          await logApprovalAction(
            payrollId,
            'submit',
            'draft',
            'approved',
            params.notes
          );

          results.success++;
          results.results.push({ payrollId, success: true });
        } catch (error) {
          results.failed++;
          results.results.push({
            payrollId,
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }

        setProcessingStatus(prev => ({
          ...prev,
          current: i + 1
        }));
      }

      setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: approvalQueryKeys.pending() });
    },
    onError: (error) => {
      setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
      handleError(error, { customMessage: '提交审批失败' });
    }
  });

  // 审批通过
  const approve = useMutation({
    mutationFn: async (params: ApprovalParams): Promise<BatchApprovalResult> => {
      // 验证状态
      const validation = await validateApprovalAction(params.payrollIds, 'draft');
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      const results: BatchApprovalResult = {
        total: params.payrollIds.length,
        success: 0,
        failed: 0,
        results: []
      };

      setProcessingStatus({
        isProcessing: true,
        current: 0,
        total: params.payrollIds.length,
        phase: '审批通过'
      });

      for (let i = 0; i < params.payrollIds.length; i++) {
        const payrollId = params.payrollIds[i];
        
        try {
          const { error } = await supabase
            .from('payrolls')
            .update({
              status: 'approved',
              updated_at: new Date().toISOString()
            })
            .eq('id', payrollId)
            .eq('status', 'draft'); // 确保状态正确

          if (error) throw error;

          await logApprovalAction(
            payrollId,
            'approve',
            'draft',
            'approved',
            params.notes
          );

          results.success++;
          results.results.push({ payrollId, success: true });
        } catch (error) {
          results.failed++;
          results.results.push({
            payrollId,
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }

        setProcessingStatus(prev => ({
          ...prev,
          current: i + 1
        }));
      }

      setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: approvalQueryKeys.pending() });
    },
    onError: (error) => {
      setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
      handleError(error, { customMessage: '审批失败' });
    }
  });

  // 审批驳回
  const reject = useMutation({
    mutationFn: async (params: RejectParams): Promise<BatchApprovalResult> => {
      if (requireReason && !params.reason) {
        throw new Error('请填写驳回原因');
      }

      const results: BatchApprovalResult = {
        total: params.payrollIds.length,
        success: 0,
        failed: 0,
        results: []
      };

      setProcessingStatus({
        isProcessing: true,
        current: 0,
        total: params.payrollIds.length,
        phase: '驳回'
      });

      for (let i = 0; i < params.payrollIds.length; i++) {
        const payrollId = params.payrollIds[i];
        
        try {
          // 获取当前状态
          const { data: payroll } = await supabase
            .from('payrolls')
            .select('status')
            .eq('id', payrollId)
            .single();

          const currentStatus = payroll?.status || 'unknown';

          // 驳回到草稿状态
          const { error } = await supabase
            .from('payrolls')
            .update({
              status: 'draft',
              notes: params.reason,
              updated_at: new Date().toISOString()
            })
            .eq('id', payrollId);

          if (error) throw error;

          await logApprovalAction(
            payrollId,
            'reject',
            currentStatus,
            'draft',
            params.reason
          );

          results.success++;
          results.results.push({ payrollId, success: true });
        } catch (error) {
          results.failed++;
          results.results.push({
            payrollId,
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }

        setProcessingStatus(prev => ({
          ...prev,
          current: i + 1
        }));
      }

      setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
    onError: (error) => {
      setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
      handleError(error, { customMessage: '驳回失败' });
    }
  });

  // 标记为已发放
  const markAsPaid = useMutation({
    mutationFn: async (params: ApprovalParams): Promise<BatchApprovalResult> => {
      // 验证状态
      const validation = await validateApprovalAction(params.payrollIds, 'approved');
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      const results: BatchApprovalResult = {
        total: params.payrollIds.length,
        success: 0,
        failed: 0,
        results: []
      };

      setProcessingStatus({
        isProcessing: true,
        current: 0,
        total: params.payrollIds.length,
        phase: '发放薪资'
      });

      for (let i = 0; i < params.payrollIds.length; i++) {
        const payrollId = params.payrollIds[i];
        
        try {
          const { error } = await supabase
            .from('payrolls')
            .update({
              status: 'paid',
              updated_at: new Date().toISOString()
            })
            .eq('id', payrollId)
            .eq('status', 'approved');

          if (error) throw error;

          await logApprovalAction(
            payrollId,
            'pay',
            'approved',
            'paid',
            params.notes
          );

          results.success++;
          results.results.push({ payrollId, success: true });
        } catch (error) {
          results.failed++;
          results.results.push({
            payrollId,
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }

        setProcessingStatus(prev => ({
          ...prev,
          current: i + 1
        }));
      }

      setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
    onError: (error) => {
      setProcessingStatus(prev => ({ ...prev, isProcessing: false }));
      handleError(error, { customMessage: '发放失败' });
    }
  });

  // 取消薪资
  const cancel = useMutation({
    mutationFn: async (params: RejectParams): Promise<BatchApprovalResult> => {
      if (!params.reason) {
        throw new Error('请填写取消原因');
      }

      const results: BatchApprovalResult = {
        total: params.payrollIds.length,
        success: 0,
        failed: 0,
        results: []
      };

      for (const payrollId of params.payrollIds) {
        try {
          // 获取当前状态
          const { data: payroll } = await supabase
            .from('payrolls')
            .select('status')
            .eq('id', payrollId)
            .single();

          const currentStatus = payroll?.status || 'unknown';

          // 只有非已发放状态可以取消
          if (currentStatus === 'paid') {
            throw new Error('已发放的薪资不能取消');
          }

          const { error } = await supabase
            .from('payrolls')
            .update({
              status: 'cancelled',
              notes: params.reason,
              updated_at: new Date().toISOString()
            })
            .eq('id', payrollId);

          if (error) throw error;

          await logApprovalAction(
            payrollId,
            'cancel',
            currentStatus,
            'cancelled',
            params.reason
          );

          results.success++;
          results.results.push({ payrollId, success: true });
        } catch (error) {
          results.failed++;
          results.results.push({
            payrollId,
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
    onError: (error) => {
      handleError(error, { customMessage: '取消失败' });
    }
  });

  // 获取审批统计
  const useApprovalStatistics = () => {
    return useQuery({
      queryKey: approvalQueryKeys.statistics(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('payrolls')
          .select('status', { count: 'exact' });

        if (error) {
          handleError(error, { customMessage: '获取审批统计失败' });
          throw error;
        }

        // 按状态分组统计
        const statistics = {
          draft: 0,
          approved: 0,
          paid: 0,
          cancelled: 0,
          total: data?.length || 0
        };

        data?.forEach(item => {
          if (item.status in statistics) {
            statistics[item.status as keyof typeof statistics]++;
          }
        });

        return statistics;
      },
      staleTime: 60 * 1000 // 1分钟缓存
    });
  };

  return {
    // 查询
    queries: {
      usePendingApprovals,
      useApprovalRecords,
      useApprovalStatistics
    },

    // 操作
    mutations: {
      submitForApproval,
      approve,
      reject,
      markAsPaid,
      cancel
    },

    // 处理状态
    processingStatus,

    // 操作方法
    actions: {
      submitForApproval: submitForApproval.mutate,
      approve: approve.mutate,
      reject: reject.mutate,
      markAsPaid: markAsPaid.mutate,
      cancel: cancel.mutate
    },

    // 加载状态
    loading: {
      submit: submitForApproval.isPending,
      approve: approve.isPending,
      reject: reject.isPending,
      pay: markAsPaid.isPending,
      cancel: cancel.isPending,
      isProcessing: processingStatus.isProcessing
    },

    // 工具函数
    utils: {
      // 检查是否可以审批
      canApprove: (status: string) => {
        return status === 'draft';
      },

      // 检查是否可以发放
      canPay: (status: string) => {
        return status === 'approved';
      },

      // 检查是否可以取消
      canCancel: (status: string) => {
        return status !== 'paid' && status !== 'cancelled';
      },

      // 获取状态流转路径
      getStatusFlow: (currentStatus: string) => {
        const flows = {
          draft: ['approved', 'cancelled'],
          approved: ['paid', 'draft', 'cancelled'],
          paid: [],
          cancelled: []
        };
        return flows[currentStatus as keyof typeof flows] || [];
      },

      // 获取处理进度百分比
      getProgressPercentage: () => {
        if (processingStatus.total === 0) return 0;
        return Math.round(
          (processingStatus.current / processingStatus.total) * 100
        );
      }
    },

    // 配置
    config
  };
}