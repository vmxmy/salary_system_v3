import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/types/supabase';

// 类型定义
type PayrollStatus = Database['public']['Enums']['payroll_status'];

// 审批汇总视图类型
export interface PayrollApprovalSummary {
  payroll_id: string;
  employee_id: string;
  employee_name: string;
  pay_date: string;
  pay_month?: string; // 月份字段
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: PayrollStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  period_id: string; // 必需的周期ID
  // 审批信息
  last_action?: string;
  last_operator?: string;
  last_action_at?: string;
  last_comments?: string;
  approval_count?: number;
  status_label?: string;
  can_operate?: boolean;
  next_action?: string;
  // 额外的审批字段
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  paid_at?: string;
  paid_by?: string;
  rejection_reason?: string;
}

// 审批记录类型
export interface ApprovalLog {
  id: string;
  payroll_id: string;
  action: 'submit' | 'approve' | 'reject' | 'pay' | 'cancel' | 'rollback';
  from_status: string;
  to_status: string;
  operator_id?: string;
  operator_name?: string;
  comments?: string;
  created_at: string;
}

// 批量操作结果
export interface BatchResult {
  payroll_id: string;
  success: boolean;
  message: string;
}

// 审批参数
export interface ApprovalParams {
  payrollIds: string[];
  comments?: string;
}

// 驳回参数
export interface RejectParams {
  payrollIds: string[];
  reason: string;
}

// 回滚参数
export interface RollbackParams {
  payrollIds: string[];
  reason: string;
  operator?: string;
}

// 查询键
const queryKeys = {
  all: ['payroll-approval-v2'] as const,
  summary: (filters?: any) => [...queryKeys.all, 'summary', filters] as const,
  logs: (payrollId: string) => [...queryKeys.all, 'logs', payrollId] as const,
  stats: () => [...queryKeys.all, 'stats'] as const,
};

/**
 * 轻量级薪资审批 Hook
 * 基于新的数据库结构实现
 */
export function usePayrollApproval() {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showWarning } = useToast();
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 获取审批汇总列表
   */
  const useApprovalSummary = (filters?: {
    status?: PayrollStatus;
    periodId?: string;
    employeeId?: string;
  }) => {
    return useQuery({
      queryKey: queryKeys.summary(filters),
      queryFn: async () => {
        let query = supabase
          .from('view_payroll_approval_summary')
          .select('*')
          .order('created_at', { ascending: false });

        // 应用过滤条件 - 主要使用 period_id
        if (filters?.status) {
          query = query.eq('status', filters.status);
        }
        if (filters?.periodId) {
          query = query.eq('period_id', filters.periodId);
        }
        if (filters?.employeeId) {
          query = query.eq('employee_id', filters.employeeId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('获取审批汇总失败:', error);
          throw error;
        }

        return (data || []) as PayrollApprovalSummary[];
      },
      staleTime: 30 * 1000, // 30秒缓存
    });
  };

  /**
   * 获取待审批列表（支持周期筛选）
   * 包括草稿和已计算状态的记录
   */
  const usePendingApprovals = (periodId?: string) => {
    return useQuery({
      queryKey: [...queryKeys.summary({ periodId }), 'pending'],
      queryFn: async () => {
        let query = supabase
          .from('view_payroll_approval_summary')
          .select('*')
          .in('status', ['draft', 'calculated']) // 包括草稿和已计算状态
          .order('created_at', { ascending: false });

        if (periodId) {
          query = query.eq('period_id', periodId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('获取待审批列表失败:', error);
          throw error;
        }

        return (data || []) as PayrollApprovalSummary[];
      },
      staleTime: 30 * 1000, // 30秒缓存
    });
  };

  /**
   * 获取审批历史记录
   */
  const useApprovalLogs = (payrollId: string) => {
    return useQuery({
      queryKey: queryKeys.logs(payrollId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('payroll_approval_logs')
          .select('*')
          .eq('payroll_id', payrollId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('获取审批记录失败:', error);
          throw error;
        }

        return (data || []) as ApprovalLog[];
      },
      enabled: !!payrollId,
      staleTime: 5 * 60 * 1000, // 5分钟缓存
    });
  };

  /**
   * 获取审批统计（支持周期筛选）
   */
  const useApprovalStats = (periodId?: string) => {
    return useQuery({
      queryKey: [...queryKeys.stats(), periodId],
      queryFn: async () => {
        let query = supabase
          .from('view_payroll_approval_summary')
          .select('status');
        
        if (periodId) {
          query = query.eq('period_id', periodId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('获取审批统计失败:', error);
          throw error;
        }

        // 按状态分组统计
        const stats: Record<string, number> = {
          draft: 0,
          approved: 0,
          paid: 0,
          cancelled: 0,
          calculating: 0,
          calculated: 0,
          total: 0,
        };

        data?.forEach(item => {
          stats.total++;
          if (item.status && item.status in stats) {
            stats[item.status]++;
          }
        });

        return stats;
      },
      staleTime: 60 * 1000, // 1分钟缓存
    });
  };

  /**
   * 批量审批通过
   */
  const approvePayrolls = useMutation({
    mutationFn: async ({ payrollIds, comments }: ApprovalParams) => {
      setIsProcessing(true);
      
      // 使用前端批量更新替代RPC函数
      const results: BatchResult[] = [];
      
      for (const payrollId of payrollIds) {
        try {
          const { error } = await supabase
            .from('payrolls')
            .update({
              status: 'approved',
              approved_at: new Date().toISOString(),
              approval_comments: comments,
              updated_at: new Date().toISOString()
            })
            .eq('id', payrollId);

          if (error) {
            results.push({ payroll_id: payrollId, success: false, message: error.message });
          } else {
            results.push({ payroll_id: payrollId, success: true, message: '审批成功' });
          }
        } catch (err) {
          results.push({ 
            payroll_id: payrollId, 
            success: false, 
            message: err instanceof Error ? err.message : '审批失败' 
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        showSuccess(`成功审批 ${successCount} 条薪资记录`);
      }
      if (failedCount > 0) {
        showWarning(`${failedCount} 条记录审批失败`);
      }

      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
    onError: (error) => {
      showError(`审批失败: ${error.message}`);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  /**
   * 批量驳回
   */
  const rejectPayrolls = useMutation({
    mutationFn: async ({ payrollIds, reason }: RejectParams) => {
      if (!reason || reason.trim() === '') {
        throw new Error('驳回原因不能为空');
      }

      setIsProcessing(true);
      
      // 使用前端批量更新替代RPC函数
      const results: BatchResult[] = [];
      
      for (const payrollId of payrollIds) {
        try {
          const { error } = await supabase
            .from('payrolls')
            .update({
              status: 'cancelled',
              rejected_at: new Date().toISOString(),
              rejection_reason: reason,
              updated_at: new Date().toISOString()
            })
            .eq('id', payrollId);

          if (error) {
            results.push({ payroll_id: payrollId, success: false, message: error.message });
          } else {
            results.push({ payroll_id: payrollId, success: true, message: '驳回成功' });
          }
        } catch (err) {
          results.push({ 
            payroll_id: payrollId, 
            success: false, 
            message: err instanceof Error ? err.message : '驳回失败' 
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        showSuccess(`成功驳回 ${successCount} 条薪资记录`);
      }
      if (failedCount > 0) {
        showWarning(`${failedCount} 条记录驳回失败`);
      }

      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
    onError: (error) => {
      showError(`驳回失败: ${error.message}`);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  /**
   * 批量标记为已发放
   */
  const markAsPaid = useMutation({
    mutationFn: async ({ payrollIds, comments }: ApprovalParams) => {
      setIsProcessing(true);
      
      const { data, error } = await supabase.rpc('batch_mark_as_paid', {
        p_payroll_ids: payrollIds,
        p_comments: comments,
      });

      if (error) {
        throw error;
      }

      return (data || []) as BatchResult[];
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        showSuccess(`成功标记 ${successCount} 条薪资为已发放`);
      }
      if (failedCount > 0) {
        showWarning(`${failedCount} 条记录标记失败`);
      }

      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
    onError: (error) => {
      showError(`标记发放失败: ${error.message}`);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  /**
   * 提交审批（将草稿状态改为待审批）
   */
  const submitForApproval = useMutation({
    mutationFn: async ({ payrollIds, comments }: ApprovalParams) => {
      setIsProcessing(true);
      
      // 使用前端批量更新替代RPC函数（因为系统设计为单级审批）
      const results: BatchResult[] = [];
      
      for (const payrollId of payrollIds) {
        try {
          const { error } = await supabase
            .from('payrolls')
            .update({
              status: 'approved',
              approved_at: new Date().toISOString(),
              approval_comments: comments || '提交审批',
              updated_at: new Date().toISOString()
            })
            .eq('id', payrollId);

          if (error) {
            results.push({ payroll_id: payrollId, success: false, message: error.message });
          } else {
            results.push({ payroll_id: payrollId, success: true, message: '提交成功' });
          }
        } catch (err) {
          results.push({ 
            payroll_id: payrollId, 
            success: false, 
            message: err instanceof Error ? err.message : '提交失败' 
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        showSuccess(`成功提交 ${successCount} 条薪资记录`);
      }
      if (failedCount > 0) {
        showWarning(`${failedCount} 条记录提交失败`);
      }

      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
    onError: (error) => {
      showError(`提交失败: ${error.message}`);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  /**
   * 取消薪资
   */
  const cancelPayrolls = useMutation({
    mutationFn: async ({ payrollIds, reason }: RejectParams) => {
      setIsProcessing(true);
      
      const updates = payrollIds.map(id => 
        supabase
          .from('payrolls')
          .update({
            status: 'cancelled' as PayrollStatus,
            rejection_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      
      // 记录审批日志
      const logs = payrollIds.map(id => ({
        payroll_id: id,
        action: 'cancel' as const,
        from_status: 'unknown',
        to_status: 'cancelled',
        operator_id: user?.id,
        operator_name: user?.email || 'System',
        comments: reason,
      }));

      await supabase.from('payroll_approval_logs').insert(logs);

      return results.map((result, index) => ({
        payroll_id: payrollIds[index],
        success: !result.error,
        message: result.error ? result.error.message : '取消成功',
      }));
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      showSuccess(`成功取消 ${successCount} 条薪资记录`);
      
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
    onError: (error) => {
      showError(`取消失败: ${error.message}`);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  /**
   * 批量回滚审批状态
   */
  const rollbackPayrolls = useMutation({
    mutationFn: async ({ payrollIds, reason, operator }: RollbackParams) => {
      if (!reason || reason.trim() === '') {
        throw new Error('回滚原因不能为空');
      }

      setIsProcessing(true);
      
      // 首先获取当前状态以确定回滚目标状态
      const { data: currentPayrolls, error: fetchError } = await supabase
        .from('payrolls')
        .select('id, status')
        .in('id', payrollIds);

      if (fetchError) {
        throw new Error(`获取薪资状态失败: ${fetchError.message}`);
      }

      const results: BatchResult[] = [];
      const rollbackLogs: any[] = [];
      
      for (const payroll of currentPayrolls || []) {
        try {
          let targetStatus: PayrollStatus;
          let canRollback = true;
          
          // 确定回滚目标状态
          switch (payroll.status) {
            case 'approved':
              targetStatus = 'calculated'; // 已审批 -> 已计算
              break;
            case 'paid':
              targetStatus = 'approved'; // 已支付 -> 已审批
              break;
            default:
              canRollback = false;
              results.push({ 
                payroll_id: payroll.id, 
                success: false, 
                message: `状态 ${payroll.status} 不支持回滚` 
              });
              continue;
          }

          if (canRollback) {
            // 执行状态回滚
            const { error: updateError } = await supabase
              .from('payrolls')
              .update({
                status: targetStatus,
                // 清除相关的审批信息（如果字段存在）
                ...(payroll.status === 'approved' && {
                  approved_at: null,
                }),
                ...(payroll.status === 'paid' && {
                  // 暂时不清除已支付时间，保留审计信息
                }),
                // 记录回滚信息到备注字段
                rejection_reason: `回滚操作: ${reason}`,
                updated_at: new Date().toISOString()
              })
              .eq('id', payroll.id);

            if (updateError) {
              results.push({ 
                payroll_id: payroll.id, 
                success: false, 
                message: updateError.message 
              });
            } else {
              results.push({ 
                payroll_id: payroll.id, 
                success: true, 
                message: '回滚成功' 
              });

              // 准备回滚日志
              rollbackLogs.push({
                payroll_id: payroll.id,
                action: 'rollback',
                from_status: payroll.status,
                to_status: targetStatus,
                operator_id: user?.id,
                operator_name: operator || user?.email || 'System',
                comments: `回滚原因: ${reason}`,
              });
            }
          }
        } catch (err) {
          results.push({ 
            payroll_id: payroll.id, 
            success: false, 
            message: err instanceof Error ? err.message : '回滚失败' 
          });
        }
      }

      // 批量插入回滚日志
      if (rollbackLogs.length > 0) {
        const { error: logError } = await supabase
          .from('payroll_approval_logs')
          .insert(rollbackLogs);

        if (logError) {
          console.error('记录回滚日志失败:', logError);
          // 不影响主要操作，仅记录警告
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        showSuccess(`成功回滚 ${successCount} 条薪资记录的审批状态`);
      }
      if (failedCount > 0) {
        showWarning(`${failedCount} 条记录回滚失败`);
        
        // 显示失败详情
        const failedResults = results.filter(r => !r.success);
        console.error('回滚失败详情:', failedResults);
      }

      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
    onError: (error) => {
      showError(`回滚失败: ${error.message}`);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  return {
    // 查询
    queries: {
      useApprovalSummary,
      usePendingApprovals,
      useApprovalLogs,
      useApprovalStats,
    },

    // 操作
    mutations: {
      approvePayrolls,
      rejectPayrolls,
      markAsPaid,
      submitForApproval,
      cancelPayrolls,
      rollbackPayrolls,
    },

    // 便捷方法
    actions: {
      approve: (payrollIds: string[], comments?: string) => 
        approvePayrolls.mutate({ payrollIds, comments }),
      
      reject: (payrollIds: string[], reason: string) => 
        rejectPayrolls.mutate({ payrollIds, reason }),
      
      markPaid: (payrollIds: string[], comments?: string) => 
        markAsPaid.mutate({ payrollIds, comments }),
      
      submit: (payrollIds: string[], comments?: string) => 
        submitForApproval.mutate({ payrollIds, comments }),
      
      cancel: (payrollIds: string[], reason: string) => 
        cancelPayrolls.mutate({ payrollIds, reason }),

      rollback: (payrollIds: string[], reason: string, operator?: string) => 
        rollbackPayrolls.mutate({ payrollIds, reason, operator }),
    },

    // 状态
    loading: {
      approve: approvePayrolls.isPending,
      reject: rejectPayrolls.isPending,
      markPaid: markAsPaid.isPending,
      submit: submitForApproval.isPending,
      cancel: cancelPayrolls.isPending,
      rollback: rollbackPayrolls.isPending,
      isProcessing,
    },

    // 工具函数
    utils: {
      // 检查是否可以审批
      canApprove: (status: PayrollStatus) => status === 'draft' || status === 'calculated',
      
      // 检查是否可以发放
      canMarkPaid: (status: PayrollStatus) => status === 'approved',
      
      // 检查是否可以取消
      canCancel: (status: PayrollStatus) => 
        status !== 'paid' && status !== 'cancelled',
      
      // 检查是否可以回滚
      canRollback: (status: PayrollStatus) => 
        status === 'approved' || status === 'paid',
      
      // 获取回滚目标状态
      getRollbackTargetStatus: (status: PayrollStatus): PayrollStatus | null => {
        switch (status) {
          case 'approved':
            return 'calculated';
          case 'paid':
            return 'approved';
          default:
            return null;
        }
      },
      
      // 批量状态更新（用于前端调用）
      batchUpdateStatus: async (payrollIds: string[], targetStatus: PayrollStatus) => {
        try {
          const results: BatchResult[] = [];
          
          for (const payrollId of payrollIds) {
            const { error } = await supabase
              .from('payrolls')
              .update({
                status: targetStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', payrollId);

            results.push({
              payroll_id: payrollId,
              success: !error,
              message: error ? error.message : '更新成功'
            });
          }
          
          return {
            success: results.every(r => r.success),
            results,
            message: results.every(r => r.success) ? '批量更新成功' : '部分更新失败'
          };
        } catch (error) {
          return {
            success: false,
            results: [],
            message: error instanceof Error ? error.message : '批量更新失败'
          };
        }
      },
      
      // 批量回滚状态（用于前端调用）
      batchRollbackStatus: async (payrollIds: string[], options: { reason: string; operator?: string }) => {
        try {
          const result = await rollbackPayrolls.mutateAsync({
            payrollIds,
            reason: options.reason,
            operator: options.operator
          });
          
          return {
            success: result.every(r => r.success),
            results: result,
            message: result.every(r => r.success) ? '批量回滚成功' : '部分回滚失败'
          };
        } catch (error) {
          return {
            success: false,
            results: [],
            message: error instanceof Error ? error.message : '批量回滚失败'
          };
        }
      },
      
      // 获取状态标签
      getStatusLabel: (status: PayrollStatus) => {
        const labels: Record<string, string> = {
          draft: '草稿',
          calculating: '计算中',
          calculated: '已计算',
          approved: '已审批',
          paid: '已发放',
          cancelled: '已取消',
        };
        return labels[status] || status;
      },
      
      // 获取状态颜色
      getStatusColor: (status: PayrollStatus) => {
        const colors: Record<string, string> = {
          draft: 'warning',
          calculating: 'processing',
          calculated: 'processing',
          approved: 'success',
          paid: 'info',
          cancelled: 'error',
        };
        return colors[status] || 'default';
      },
      
      // 获取下一步操作
      getNextAction: (status: PayrollStatus) => {
        const actions: Record<string, string> = {
          draft: '提交审批',
          calculating: '等待计算',
          calculated: '提交审批',
          approved: '标记发放',
          paid: '已完成',
          cancelled: '已取消',
        };
        return actions[status] || '无';
      },
    },
  };
}