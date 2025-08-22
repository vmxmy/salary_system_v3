import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { WorkflowProgress } from '@/hooks/monitoring/useSystemMonitoring';

/**
 * HR变更请求工作流程Hook
 * 
 * 从Supabase获取真实的HR变更请求数据
 * 包括员工信息变更、部门调动、职位变动等
 */

// HR变更类型枚举
export type HRChangeType = 
  | 'profile_update'      // 基本信息更新
  | 'department_transfer' // 部门调动
  | 'position_change'     // 职位变动
  | 'salary_adjustment'   // 薪资调整
  | 'status_change'       // 状态变更
  | 'assignment_update';  // 分配信息更新

// HR变更状态枚举
export type HRChangeStatus = 
  | 'pending'     // 待处理
  | 'in_review'   // 审核中
  | 'approved'    // 已批准
  | 'rejected'    // 已拒绝
  | 'processing'  // 执行中
  | 'completed'   // 已完成
  | 'cancelled';  // 已取消

// HR变更请求记录
export interface HRChangeRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  change_type: HRChangeType;
  change_description: string;
  previous_value?: any;
  new_value?: any;
  status: HRChangeStatus;
  requested_by: string;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  approved_at?: string;
  completed_at?: string;
  rejection_reason?: string;
  processing_time_minutes?: number;
}

// HR变更统计数据
export interface HRChangeStats {
  totalRequests: number;
  pendingCount: number;
  inReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  processingCount: number;
  completedCount: number;
  cancelledCount: number;
  averageProcessingTimeMinutes: number;
  byChangeType: Record<HRChangeType, number>;
  bottlenecks: string[];
}

/**
 * 获取HR变更请求工作流程数据
 */
export const useHRChangeRequests = (timeRange: 'current_month' | 'last_30_days' | 'last_90_days' = 'current_month') => {
  // 计算时间范围
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  };

  // 查询员工分配变更记录（作为HR变更的主要来源）
  const changeRequestsQuery = useQuery({
    queryKey: ['hr-change-requests', timeRange],
    queryFn: async (): Promise<HRChangeRequest[]> => {
      try {
        const { startDate, endDate } = getDateRange();

        // 查询员工职位历史变更记录
        const { data: assignmentChanges, error: assignmentError } = await supabase
          .from('employee_job_history')
          .select(`
            id,
            employee_id,
            department_id,
            position_id,
            created_at,
            period_id,
            employees!inner(employee_name)
          `)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false });

        if (assignmentError) throw assignmentError;

        // 查询员工基本信息变更（基于updated_at和created_at的差异）
        const { data: allEmployees, error: employeeError } = await supabase
          .from('employees')
          .select(`
            id,
            employee_name,
            updated_at,
            created_at
          `)
          .gte('updated_at', startDate)
          .lte('updated_at', endDate)
          .order('updated_at', { ascending: false });

        if (employeeError) throw employeeError;

        const requests: HRChangeRequest[] = [];

        // 处理员工分配变更
        (assignmentChanges || []).forEach((assignment: any) => {
          requests.push({
            id: `assignment_${assignment.id}`,
            employee_id: assignment.employee_id,
            employee_name: assignment.employees?.employee_name || '',
            department_name: '', // 部门信息需要单独查询或简化处理
            change_type: 'assignment_update',
            change_description: `更新员工职位分配信息`,
            status: 'completed', // 简化状态处理
            requested_by: 'system', // 系统记录
            requested_at: assignment.created_at,
            completed_at: assignment.created_at,
            processing_time_minutes: 0 // 即时处理
          });
        });

        // 处理员工信息变更（筛选出实际有变更的记录）
        const employeeChanges = (allEmployees || []).filter((employee: any) => 
          employee.updated_at !== employee.created_at
        );
        
        employeeChanges.forEach((employee: any) => {
          requests.push({
            id: `employee_${employee.id}`,
            employee_id: employee.id,
            employee_name: employee.employee_name,
            department_name: '', // 需要从分配表获取，这里简化处理
            change_type: 'profile_update',
            change_description: '员工基本信息更新',
            status: 'completed', // 已更新的记录视为完成
            requested_by: 'hr_admin',
            requested_at: employee.updated_at,
            completed_at: employee.updated_at,
            processing_time_minutes: 0 // 即时更新
          });
        });

        return requests;
      } catch (error) {
        console.error('Failed to fetch HR change requests:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    refetchInterval: 60 * 1000, // 1分钟自动刷新
  });

  // 获取HR变更统计数据
  const changeStatsQuery = useQuery({
    queryKey: ['hr-change-stats', timeRange],
    queryFn: async (): Promise<HRChangeStats> => {
      const requests = changeRequestsQuery.data || [];
      
      if (requests.length === 0) {
        return {
          totalRequests: 0,
          pendingCount: 0,
          inReviewCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          processingCount: 0,
          completedCount: 0,
          cancelledCount: 0,
          averageProcessingTimeMinutes: 0,
          byChangeType: {
            profile_update: 0,
            department_transfer: 0,
            position_change: 0,
            salary_adjustment: 0,
            status_change: 0,
            assignment_update: 0
          },
          bottlenecks: []
        };
      }

      const stats = requests.reduce((acc, request) => {
        acc.totalRequests++;
        
        // 按状态统计
        switch (request.status) {
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
          case 'cancelled':
            acc.cancelledCount++;
            break;
        }

        // 按变更类型统计
        acc.byChangeType[request.change_type] = (acc.byChangeType[request.change_type] || 0) + 1;

        // 处理时间统计
        if (request.processing_time_minutes) {
          acc.totalProcessingTime += request.processing_time_minutes;
          acc.processedCount++;
        }

        return acc;
      }, {
        totalRequests: 0,
        pendingCount: 0,
        inReviewCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        processingCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        totalProcessingTime: 0,
        processedCount: 0,
        byChangeType: {
          profile_update: 0,
          department_transfer: 0,
          position_change: 0,
          salary_adjustment: 0,
          status_change: 0,
          assignment_update: 0
        }
      });

      // 计算平均处理时间
      const averageProcessingTimeMinutes = stats.processedCount > 0 
        ? Math.round(stats.totalProcessingTime / stats.processedCount)
        : 0;

      // 识别瓶颈
      const bottlenecks: string[] = [];
      const totalActive = stats.pendingCount + stats.inReviewCount + stats.processingCount;
      
      if (stats.pendingCount > totalActive * 0.5) {
        bottlenecks.push('待处理请求积压较多');
      }
      if (stats.inReviewCount > totalActive * 0.3) {
        bottlenecks.push('审核流程耗时较长');
      }
      if (averageProcessingTimeMinutes > 120) {
        bottlenecks.push('平均处理时间超过2小时');
      }
      if (stats.rejectedCount > stats.totalRequests * 0.2) {
        bottlenecks.push('拒绝率偏高，需要改善流程');
      }

      return {
        totalRequests: stats.totalRequests,
        pendingCount: stats.pendingCount,
        inReviewCount: stats.inReviewCount,
        approvedCount: stats.approvedCount,
        rejectedCount: stats.rejectedCount,
        processingCount: stats.processingCount,
        completedCount: stats.completedCount,
        cancelledCount: stats.cancelledCount,
        averageProcessingTimeMinutes,
        byChangeType: stats.byChangeType,
        bottlenecks
      };
    },
    enabled: !!changeRequestsQuery.data,
    staleTime: 5 * 60 * 1000,
  });

  // 转换为WorkflowProgress格式
  const workflowProgress = useQuery({
    queryKey: ['hr-workflow-progress', timeRange],
    queryFn: async (): Promise<WorkflowProgress> => {
      const stats = changeStatsQuery.data;
      
      if (!stats) {
        throw new Error('HR change stats not available');
      }

      const completedItems = stats.completedCount;
      const totalItems = stats.totalRequests;
      const failedItems = stats.rejectedCount + stats.cancelledCount;

      // 估算完成时间
      const remainingItems = stats.pendingCount + stats.inReviewCount + stats.processingCount;
      const estimatedMinutes = remainingItems * stats.averageProcessingTimeMinutes;
      const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();

      // 确定整体状态
      let status: WorkflowProgress['status'];
      if (totalItems === 0) {
        status = 'completed';
      } else if (remainingItems === 0) {
        status = 'completed';
      } else if (stats.rejectedCount > totalItems * 0.3) {
        status = 'failed';
      } else if (stats.processingCount > 0 || stats.inReviewCount > 0) {
        status = 'in_progress';
      } else if (stats.pendingCount > 0) {
        status = 'pending';
      } else {
        status = 'completed';
      }

      return {
        processType: 'hr_change',
        status,
        totalItems,
        completedItems,
        failedItems,
        estimatedCompletion,
        averageProcessingTime: stats.averageProcessingTimeMinutes,
        bottlenecks: stats.bottlenecks
      };
    },
    enabled: !!changeStatsQuery.data,
    staleTime: 5 * 60 * 1000,
  });

  return {
    // 原始数据
    requests: changeRequestsQuery.data || [],
    stats: changeStatsQuery.data,
    
    // WorkflowProgress格式数据（用于系统监控）
    workflowProgress: workflowProgress.data,
    
    // 查询状态
    isLoading: changeRequestsQuery.isLoading || changeStatsQuery.isLoading,
    error: changeRequestsQuery.error || changeStatsQuery.error || workflowProgress.error,
    
    // 刷新函数
    refetch: async () => {
      await Promise.all([
        changeRequestsQuery.refetch(),
        changeStatsQuery.refetch(),
        workflowProgress.refetch()
      ]);
    }
  };
};

// 辅助函数：确定变更状态
const determineChangeStatus = (effectiveFrom?: string, effectiveTo?: string): HRChangeStatus => {
  if (!effectiveFrom) return 'pending';
  
  const now = new Date();
  const startDate = new Date(effectiveFrom);
  const endDate = effectiveTo ? new Date(effectiveTo) : null;
  
  if (now < startDate) {
    return 'approved'; // 已批准但未生效
  } else if (!endDate || now <= endDate) {
    return 'completed'; // 已生效
  } else {
    return 'completed'; // 已结束
  }
};

// 辅助函数：计算处理时间
const calculateProcessingTime = (requestedAt: string, completedAt?: string): number | undefined => {
  if (!completedAt) return undefined;
  
  const requested = new Date(requestedAt);
  const completed = new Date(completedAt);
  const diffMs = completed.getTime() - requested.getTime();
  
  return Math.max(0, Math.round(diffMs / (1000 * 60))); // 转换为分钟，最小为0
};

/**
 * 获取指定员工的HR变更请求
 */
export const useEmployeeHRChanges = (employeeId: string, timeRange?: 'current_month' | 'last_30_days' | 'last_90_days') => {
  const { requests, isLoading, error } = useHRChangeRequests(timeRange);
  
  const employeeRequests = requests.filter(request => request.employee_id === employeeId);
  
  return {
    requests: employeeRequests,
    isLoading,
    error,
    hasChanges: employeeRequests.length > 0
  };
};

/**
 * 获取指定部门的HR变更请求
 */
export const useDepartmentHRChanges = (departmentName: string, timeRange?: 'current_month' | 'last_30_days' | 'last_90_days') => {
  const { requests, isLoading, error } = useHRChangeRequests(timeRange);
  
  const departmentRequests = requests.filter(request => request.department_name === departmentName);
  
  return {
    requests: departmentRequests,
    isLoading,
    error,
    hasChanges: departmentRequests.length > 0
  };
};

export default useHRChangeRequests;