import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { WorkflowProgress } from '@/hooks/monitoring/useSystemMonitoring';

/**
 * 薪资审批工作流程Hook
 * 
 * 从Supabase获取真实的薪资审批进度和状态数据
 * 替换useSystemMonitoring中的模拟工作流程数据
 */

// 薪资审批状态枚举
export type PayrollApprovalStatus = 
  | 'pending'           // 待审批
  | 'in_review'         // 审批中
  | 'approved'          // 已通过
  | 'rejected'          // 已拒绝
  | 'processing'        // 处理中
  | 'completed'         // 已完成
  | 'failed';           // 处理失败

// 薪资审批记录接口
export interface PayrollApprovalRecord {
  id: string;
  payroll_period: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  gross_amount: number;
  status: PayrollApprovalStatus;
  submitted_at: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_reason?: string;
  processing_time_minutes?: number;
}

// 审批统计数据
export interface PayrollApprovalStats {
  totalRecords: number;
  pendingCount: number;
  inReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  averageProcessingTimeMinutes: number;
  bottlenecks: string[];
}

/**
 * 获取薪资审批工作流程数据
 */
export const usePayrollApprovalWorkflow = (period?: string) => {
  // 获取当前期间（如未指定）
  const currentPeriod = period || new Date().toISOString().slice(0, 7);
  
  // 查询薪资审批记录
  const approvalRecordsQuery = useQuery({
    queryKey: ['payroll-approval-records', currentPeriod],
    queryFn: async (): Promise<PayrollApprovalRecord[]> => {
      try {
        // 从薪资表获取审批状态数据
        const { data: payrollData, error: payrollError } = await supabase
          .from('payrolls')
          .select(`
            id,
            employee_id,
            gross_pay,
            status,
            created_at,
            updated_at,
            period_id,
            submitted_at,
            approved_at,
            approved_by,
            employees!inner(employee_name, id)
          `)
          .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString())
          .order('created_at', { ascending: false });

        if (payrollError) throw payrollError;

        // 转换数据格式
        const records: PayrollApprovalRecord[] = (payrollData || []).map((record: any) => ({
          id: record.id,
          payroll_period: record.period_id || currentPeriod,
          employee_id: record.employee_id,
          employee_name: record.employees?.employee_name || '',
          department_name: '', // 部门信息需要单独查询
          gross_amount: record.gross_pay || 0,
          status: mapPayrollStatusToApprovalStatus(record.status),
          submitted_at: record.submitted_at || record.created_at,
          approved_at: record.approved_at,
          processing_time_minutes: calculateProcessingTime(record.submitted_at || record.created_at, record.approved_at || record.updated_at)
        }));

        return records;
      } catch (error) {
        console.error('Failed to fetch payroll approval records:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2分钟缓存
    refetchInterval: 30 * 1000, // 30秒自动刷新
  });

  // 获取审批统计数据
  const approvalStatsQuery = useQuery({
    queryKey: ['payroll-approval-stats', currentPeriod],
    queryFn: async (): Promise<PayrollApprovalStats> => {
      const records = approvalRecordsQuery.data || [];
      
      if (records.length === 0) {
        return {
          totalRecords: 0,
          pendingCount: 0,
          inReviewCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          processingCount: 0,
          completedCount: 0,
          failedCount: 0,
          averageProcessingTimeMinutes: 0,
          bottlenecks: []
        };
      }

      const stats = records.reduce((acc, record) => {
        acc.totalRecords++;
        
        switch (record.status) {
          case 'pending':
            acc.pendingCount++;
            break;
          case 'in_review':
            acc.inReviewCount++;
            break;
          case 'approved':
            acc.approvedCount++;
            break;
          case 'rejected':
            acc.rejectedCount++;
            break;
          case 'processing':
            acc.processingCount++;
            break;
          case 'completed':
            acc.completedCount++;
            break;
          case 'failed':
            acc.failedCount++;
            break;
        }

        if (record.processing_time_minutes) {
          acc.totalProcessingTime += record.processing_time_minutes;
          acc.processedCount++;
        }

        return acc;
      }, {
        totalRecords: 0,
        pendingCount: 0,
        inReviewCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
        totalProcessingTime: 0,
        processedCount: 0
      });

      // 计算平均处理时间
      const averageProcessingTimeMinutes = stats.processedCount > 0 
        ? Math.round(stats.totalProcessingTime / stats.processedCount)
        : 0;

      // 识别瓶颈
      const bottlenecks: string[] = [];
      const totalActive = stats.pendingCount + stats.inReviewCount + stats.processingCount;
      
      if (stats.pendingCount > totalActive * 0.6) {
        bottlenecks.push('待审批记录积压较多');
      }
      if (stats.inReviewCount > totalActive * 0.4) {
        bottlenecks.push('审批流程耗时较长');
      }
      if (stats.failedCount > stats.totalRecords * 0.1) {
        bottlenecks.push('处理失败率偏高');
      }
      if (averageProcessingTimeMinutes > 60) {
        bottlenecks.push('平均处理时间过长');
      }

      return {
        totalRecords: stats.totalRecords,
        pendingCount: stats.pendingCount,
        inReviewCount: stats.inReviewCount,
        approvedCount: stats.approvedCount,
        rejectedCount: stats.rejectedCount,
        processingCount: stats.processingCount,
        completedCount: stats.completedCount,
        failedCount: stats.failedCount,
        averageProcessingTimeMinutes,
        bottlenecks
      };
    },
    enabled: !!approvalRecordsQuery.data,
    staleTime: 2 * 60 * 1000,
  });

  // 转换为WorkflowProgress格式
  const workflowProgress = useQuery({
    queryKey: ['payroll-workflow-progress', currentPeriod],
    queryFn: async (): Promise<WorkflowProgress> => {
      const stats = approvalStatsQuery.data;
      
      if (!stats) {
        throw new Error('Approval stats not available');
      }

      const completedItems = stats.approvedCount + stats.completedCount;
      const totalItems = stats.totalRecords;
      const failedItems = stats.rejectedCount + stats.failedCount;

      // 估算完成时间（基于当前进度和平均处理时间）
      const remainingItems = totalItems - completedItems - failedItems;
      const estimatedMinutes = remainingItems * stats.averageProcessingTimeMinutes;
      const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();

      // 确定整体状态
      let status: WorkflowProgress['status'];
      if (totalItems === 0) {
        status = 'completed';
      } else if (completedItems === totalItems) {
        status = 'completed';
      } else if (stats.failedCount > totalItems * 0.2) {
        status = 'failed';
      } else if (stats.inReviewCount > 0 || stats.processingCount > 0) {
        status = 'in_progress';
      } else if (stats.pendingCount > 0) {
        status = 'pending';
      } else {
        status = 'completed';
      }

      return {
        processType: 'payroll_approval',
        status,
        totalItems,
        completedItems,
        failedItems,
        estimatedCompletion,
        averageProcessingTime: stats.averageProcessingTimeMinutes,
        bottlenecks: stats.bottlenecks
      };
    },
    enabled: !!approvalStatsQuery.data,
    staleTime: 2 * 60 * 1000,
  });

  return {
    // 原始数据
    records: approvalRecordsQuery.data || [],
    stats: approvalStatsQuery.data,
    
    // WorkflowProgress格式数据（用于系统监控）
    workflowProgress: workflowProgress.data,
    
    // 查询状态
    isLoading: approvalRecordsQuery.isLoading || approvalStatsQuery.isLoading,
    error: approvalRecordsQuery.error || approvalStatsQuery.error || workflowProgress.error,
    
    // 刷新函数
    refetch: async () => {
      await Promise.all([
        approvalRecordsQuery.refetch(),
        approvalStatsQuery.refetch(),
        workflowProgress.refetch()
      ]);
    }
  };
};

// 辅助函数：映射薪资状态到审批状态
const mapPayrollStatusToApprovalStatus = (payrollStatus: string): PayrollApprovalStatus => {
  const statusMapping: Record<string, PayrollApprovalStatus> = {
    'draft': 'pending',
    'submitted': 'pending', 
    'under_review': 'in_review',
    'approved': 'approved',
    'rejected': 'rejected',
    'processing': 'processing',
    'paid': 'completed',
    'failed': 'failed',
    'cancelled': 'rejected'
  };
  
  return statusMapping[payrollStatus] || 'pending';
};

// 辅助函数：计算处理时间
const calculateProcessingTime = (createdAt: string, updatedAt?: string): number | undefined => {
  if (!updatedAt || createdAt === updatedAt) return undefined;
  
  const created = new Date(createdAt);
  const updated = new Date(updatedAt);
  const diffMs = updated.getTime() - created.getTime();
  
  return Math.round(diffMs / (1000 * 60)); // 转换为分钟
};

/**
 * 获取指定员工的薪资审批状态
 */
export const useEmployeePayrollApproval = (employeeId: string, period?: string) => {
  const { records, isLoading, error } = usePayrollApprovalWorkflow(period);
  
  const employeeRecord = records.find(record => record.employee_id === employeeId);
  
  return {
    record: employeeRecord,
    isLoading,
    error,
    hasRecord: !!employeeRecord
  };
};

export default usePayrollApprovalWorkflow;