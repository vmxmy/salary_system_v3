import { supabase } from '@/lib/supabase';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';

// 支持的操作日志类型
export type LogAction = 'calculate' | 'calculate_insurance' | 'submit' | 'approve' | 'reject' | 'pay' | 'cancel';

// 日志记录参数
export interface LogParams {
  payrollId: string;
  action: LogAction;
  fromStatus: string;
  toStatus: string;
  comments?: string;
  operator?: string;
}

// 批量日志记录参数
export interface BatchLogParams {
  payrollIds: string[];
  action: LogAction;
  fromStatus: string;
  toStatus: string;
  comments?: string;
  operator?: string;
  successCount?: number;
  errorCount?: number;
  totalCount?: number;
}

/**
 * 薪资操作日志记录 Hook
 * 统一管理所有薪资相关操作的日志记录
 */
export function usePayrollLogger() {
  const { user } = useUnifiedAuth();

  /**
   * 记录单个薪资操作日志
   */
  const logSingle = async (params: LogParams): Promise<boolean> => {
    try {
      const logEntry = {
        payroll_id: params.payrollId,
        action: params.action,
        from_status: params.fromStatus,
        to_status: params.toStatus,
        operator_id: user?.id,
        operator_name: params.operator || user?.email || 'System',
        comments: params.comments || null,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('payroll_approval_logs')
        .insert([logEntry]);

      if (error) {
        console.error(`记录${params.action}操作日志失败:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`记录${params.action}操作日志异常:`, error);
      return false;
    }
  };

  /**
   * 记录批量薪资操作日志
   */
  const logBatch = async (params: BatchLogParams): Promise<boolean> => {
    try {
      const currentTime = new Date().toISOString();
      const operatorName = params.operator || user?.email || 'System';
      
      // 创建单条批量操作日志记录
      // 使用第一个 payroll_id 作为代表，在 comments 中记录详细信息
      const batchLogEntry = {
        payroll_id: params.payrollIds[0], // 必填字段，使用第一个ID作为代表
        action: params.action,
        from_status: params.fromStatus,
        to_status: params.toStatus,
        operator_id: user?.id,
        operator_name: operatorName,
        comments: buildBatchComments(params),
        created_at: currentTime
      };

      // 只插入一条记录，大大减少数据库负载和出错概率
      const { error } = await supabase
        .from('payroll_approval_logs')
        .insert([batchLogEntry]);

      if (error) {
        console.error(`记录批量${params.action}操作日志失败:`, error);
        return false;
      }

      console.log(`✅ 成功记录批量${params.action}操作日志 (影响 ${params.payrollIds.length} 条记录)`);
      return true;
    } catch (error) {
      console.error(`记录批量${params.action}操作日志异常:`, error);
      return false;
    }
  };

  /**
   * 构建批量操作的备注信息
   */
  const buildBatchComments = (params: BatchLogParams): string => {
    const baseComment = params.comments || '';
    const statsInfo = [];
    
    // 添加影响的记录数量
    statsInfo.push(`影响记录: ${params.payrollIds.length}`);
    
    if (params.totalCount !== undefined) {
      statsInfo.push(`总计: ${params.totalCount}`);
    }
    if (params.successCount !== undefined) {
      statsInfo.push(`成功: ${params.successCount}`);
    }
    if (params.errorCount !== undefined && params.errorCount > 0) {
      statsInfo.push(`失败: ${params.errorCount}`);
    }

    const batchInfo = `批量${params.action} (${statsInfo.join(', ')})`;
    
    // 添加所有相关的薪资记录ID（截取前几个，避免过长）
    const displayIds = params.payrollIds.length <= 5 
      ? params.payrollIds
      : [...params.payrollIds.slice(0, 3), '...', params.payrollIds[params.payrollIds.length - 1]];
    
    const idsInfo = `记录ID: [${displayIds.join(', ')}]`;
    
    const fullComment = baseComment 
      ? `${batchInfo} - ${baseComment} | ${idsInfo}`
      : `${batchInfo} | ${idsInfo}`;
    
    return fullComment;
  };

  /**
   * 记录薪资计算日志
   */
  const logCalculation = async (params: {
    payrollIds: string[];
    successCount: number;
    errorCount: number;
    calculationType?: 'single' | 'batch';
    details?: string;
  }) => {
    const { payrollIds, successCount, errorCount, calculationType = 'batch', details } = params;
    
    return await logBatch({
      payrollIds,
      action: 'calculate',
      fromStatus: 'draft', // 通常从草稿状态开始计算
      toStatus: successCount > 0 ? 'calculated' : 'draft',
      comments: details || `${calculationType === 'single' ? '单个' : '批量'}薪资计算`,
      successCount,
      errorCount,
      totalCount: payrollIds.length
    });
  };

  /**
   * 记录五险一金计算日志
   */
  const logInsuranceCalculation = async (params: {
    payrollIds: string[];
    successCount: number;
    errorCount: number;
    insuranceTypes?: string[];
    details?: string;
  }) => {
    const { payrollIds, successCount, errorCount, insuranceTypes, details } = params;
    
    const insuranceInfo = insuranceTypes?.length ? ` (${insuranceTypes.join(', ')})` : '';
    const comment = details || `五险一金计算${insuranceInfo}`;
    
    return await logBatch({
      payrollIds,
      action: 'calculate_insurance',
      fromStatus: 'draft',
      toStatus: 'draft', // 五险一金计算不改变薪资状态
      comments: comment,
      successCount,
      errorCount,
      totalCount: payrollIds.length
    });
  };

  return {
    // 基础日志记录
    logSingle,
    logBatch,
    
    // 专用日志记录方法
    logCalculation,
    logInsuranceCalculation,
    
    // 工具方法
    buildBatchComments,
  };
}

// Re-export types for external use
export type { 
  LogAction as LogActionType, 
  LogParams as LogParamsType, 
  BatchLogParams as BatchLogParamsType 
};