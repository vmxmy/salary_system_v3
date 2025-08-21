import React from 'react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type PayrollStatus = Database['public']['Enums']['payroll_status'];

export interface BatchApprovalItem {
  payroll_id: string;
  employee_name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
  error?: string;
  net_pay?: number;
}

interface BatchApprovalProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  operationType: 'approve' | 'reject' | 'markPaid' | 'rollback';
  items: BatchApprovalItem[];
  currentItemId?: string;
  totalProgress: number; // 0-100
  allowCancel?: boolean;
  onCancel?: () => void;
  className?: string;
  summary?: {
    total: number;
    completed: number;
    failed: number;
    successAmount?: number;
    failedAmount?: number;
  };
}

export function BatchApprovalProgressModal({
  isOpen,
  onClose,
  title,
  operationType,
  items,
  currentItemId,
  totalProgress,
  allowCancel = false,
  onCancel,
  className,
  summary
}: BatchApprovalProgressModalProps) {
  if (!isOpen) return null;

  const isCompleted = items.every(item => item.status === 'completed' || item.status === 'error');
  const hasError = items.some(item => item.status === 'error');
  const isRunning = items.some(item => item.status === 'processing');
  const successCount = items.filter(item => item.status === 'completed').length;
  const errorCount = items.filter(item => item.status === 'error').length;

  const getItemIcon = (item: BatchApprovalItem) => {
    switch (item.status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'processing':
        return <span className="loading loading-spinner loading-xs text-primary"></span>;
      case 'error':
        return (
          <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <div className="w-4 h-4 rounded-full border-2 border-base-300"></div>
        );
    }
  };

  const getItemStatusColor = (item: BatchApprovalItem) => {
    switch (item.status) {
      case 'completed':
        return 'text-success';
      case 'processing':
        return 'text-primary';
      case 'error':
        return 'text-error';
      default:
        return 'text-base-content/60';
    }
  };

  const getOperationIcon = () => {
    switch (operationType) {
      case 'approve':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'markPaid':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'rollback':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  return (
    <div className="modal modal-open">
      <div className={cn(
        "modal-box w-11/12 max-w-4xl max-h-[90vh] flex flex-col",
        className
      )}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between pb-4 border-b border-base-200">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isRunning ? "bg-primary/10 text-primary" : 
              hasError ? "bg-error/10 text-error" : "bg-success/10 text-success"
            )}>
              {isRunning && (
                <span className="loading loading-spinner loading-sm text-primary"></span>
              )}
              {!isRunning && getOperationIcon()}
            </div>
            <div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-sm text-base-content/70">
                {isCompleted 
                  ? `处理完成: ${successCount} 成功, ${errorCount} 失败` 
                  : `正在处理 ${items.length} 条记录...`
                }
              </p>
            </div>
          </div>
          {!isRunning && (
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6m0 12L6 6" />
              </svg>
            </button>
          )}
        </div>

        {/* 总体进度条 */}
        <div className="mt-4 mb-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">总体进度</span>
            <span className="text-sm text-base-content/70">{Math.round(totalProgress)}%</span>
          </div>
          <div className="w-full bg-base-200 rounded-full h-2">
            <div 
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                hasError && isCompleted ? "bg-error" : 
                isCompleted ? "bg-success" : "bg-primary"
              )}
              style={{ width: `${totalProgress}%` }}
            ></div>
          </div>
        </div>

        {/* 汇总统计 */}
        {summary && isCompleted && (
          <div className="mb-6 p-4 bg-base-100 rounded-lg border border-base-200 flex-shrink-0">
            <h4 className="font-semibold mb-3 text-sm">操作汇总</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-base-content">{summary.total}</div>
                <div className="text-xs text-base-content/60">总数</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-success">{summary.completed}</div>
                <div className="text-xs text-base-content/60">成功</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-error">{summary.failed}</div>
                <div className="text-xs text-base-content/60">失败</div>
              </div>
              {summary.successAmount !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{formatCurrency(summary.successAmount)}</div>
                  <div className="text-xs text-base-content/60">成功金额</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 记录列表 */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
          {items.map((item, index) => (
            <div
              key={item.payroll_id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all border",
                item.status === 'processing' ? "bg-primary/5 border-primary/20" : 
                item.status === 'completed' ? "bg-success/5 border-success/20" :
                item.status === 'error' ? "bg-error/5 border-error/20" :
                "bg-base-50 border-base-200",
                currentItemId === item.payroll_id ? "ring-2 ring-primary/30" : ""
              )}
            >
              {/* 序号和状态图标 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-base-content/50 w-8 text-center">{index + 1}</span>
                {getItemIcon(item)}
              </div>

              {/* 员工信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "font-medium truncate",
                    getItemStatusColor(item)
                  )}>
                    {item.employee_name}
                  </span>
                  {item.net_pay && (
                    <span className="text-xs text-base-content/60 ml-2">
                      {formatCurrency(item.net_pay)}
                    </span>
                  )}
                </div>

                {/* 状态消息 */}
                {item.message && item.status === 'processing' && (
                  <p className="text-xs text-base-content/60 mt-1">
                    {item.message}
                  </p>
                )}

                {/* 错误信息 */}
                {item.error && item.status === 'error' && (
                  <p className="text-xs text-error mt-1 truncate" title={item.error}>
                    {item.error}
                  </p>
                )}

                {/* 完成消息 */}
                {item.status === 'completed' && (
                  <p className="text-xs text-success mt-1">
                    {item.message || '处理完成'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="modal-action mt-6 pt-4 border-t border-base-200 flex-shrink-0">
          {isRunning && allowCancel && onCancel && (
            <button
              className="btn btn-outline btn-error"
              onClick={onCancel}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              取消操作
            </button>
          )}
          
          {isCompleted && (
            <button
              className="btn btn-primary ml-auto"
              onClick={onClose}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {hasError ? '关闭窗口' : '完成'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 默认导出
export default BatchApprovalProgressModal;

// 工具函数：创建批量审批项目
export function createBatchApprovalItems(
  payrollData: Array<{ payroll_id: string; employee_name: string; net_pay?: number }>
): BatchApprovalItem[] {
  return payrollData.map(item => ({
    payroll_id: item.payroll_id,
    employee_name: item.employee_name,
    status: 'pending',
    net_pay: item.net_pay
  }));
}

// 工具函数：更新批量审批项目状态
export function updateBatchApprovalItem(
  items: BatchApprovalItem[],
  payroll_id: string,
  updates: Partial<BatchApprovalItem>
): BatchApprovalItem[] {
  return items.map(item =>
    item.payroll_id === payroll_id
      ? { ...item, ...updates }
      : item
  );
}

// 工具函数：计算汇总统计
export function calculateBatchSummary(items: BatchApprovalItem[]) {
  const completed = items.filter(item => item.status === 'completed');
  const failed = items.filter(item => item.status === 'error');
  
  return {
    total: items.length,
    completed: completed.length,
    failed: failed.length,
    successAmount: completed.reduce((sum, item) => sum + (item.net_pay || 0), 0),
    failedAmount: failed.reduce((sum, item) => sum + (item.net_pay || 0), 0)
  };
}