import { useState, useRef } from 'react';
import { usePayrollApproval, type PayrollApprovalSummary } from '@/hooks/payroll/usePayrollApproval';
import { BatchApprovalProgressModal, createBatchApprovalItems, updateBatchApprovalItem, calculateBatchSummary, type BatchApprovalItem } from './BatchApprovalProgressModal';
import type { Database } from '@/types/supabase';

type PayrollStatus = Database['public']['Enums']['payroll_status'];

interface PayrollApprovalActionsProps {
  selectedIds: string[];
  selectedStatus?: PayrollStatus[];
  selectedPayrolls?: PayrollApprovalSummary[]; // 添加完整的薪资数据
  onSuccess?: () => void;
  className?: string;
}

/**
 * 薪资审批操作按钮组
 * 根据选中记录的状态显示相应的操作按钮
 */
export function PayrollApprovalActions({ 
  selectedIds, 
  selectedStatus = [],
  selectedPayrolls = [],
  onSuccess,
  className = ''
}: PayrollApprovalActionsProps) {
  const { actions, loading, utils, mutations } = usePayrollApproval();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveComments, setApproveComments] = useState('');
  
  // 批量审批进度相关状态
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressItems, setProgressItems] = useState<BatchApprovalItem[]>([]);
  const [currentOperation, setCurrentOperation] = useState<'approve' | 'reject' | 'markPaid' | 'rollback'>('approve');
  const [currentItemId, setCurrentItemId] = useState<string>();
  const [totalProgress, setTotalProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 判断可执行的操作
  const canApprove = selectedStatus.every(status => utils.canApprove(status));
  const canMarkPaid = selectedStatus.every(status => utils.canMarkPaid(status));
  const canCancel = selectedStatus.every(status => utils.canCancel(status));
  
  // 如果没有选中记录，不显示任何按钮
  if (selectedIds.length === 0) {
    return null;
  }

  // 处理批量审批
  const handleApprove = async () => {
    setShowApproveModal(false);
    startBatchOperation('approve', approveComments);
    setApproveComments('');
  };

  // 处理批量驳回
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('请输入驳回原因');
      return;
    }
    setShowRejectModal(false);
    startBatchOperation('reject', rejectReason);
    setRejectReason('');
  };

  // 处理标记发放
  const handleMarkPaid = async () => {
    const confirmed = confirm(`确认标记 ${selectedIds.length} 条记录为已发放？`);
    if (!confirmed) return;
    
    startBatchOperation('markPaid');
  };

  // 处理取消
  const handleCancel = async () => {
    const reason = prompt('请输入取消原因：');
    if (!reason) return;
    
    startBatchOperation('rollback', reason);
  };

  // 启动批量操作
  const startBatchOperation = (operation: 'approve' | 'reject' | 'markPaid' | 'rollback', comments?: string) => {
    // 创建批量审批项目
    const items = createBatchApprovalItems(
      selectedPayrolls.length > 0 ? selectedPayrolls : 
      selectedIds.map(id => ({
        payroll_id: id,
        employee_name: '未知员工', // 如果没有完整数据则使用默认值
        net_pay: 0
      }))
    );
    
    setProgressItems(items);
    setCurrentOperation(operation);
    setTotalProgress(0);
    setCurrentItemId(undefined);
    setShowProgressModal(true);
    
    // 创建新的取消控制器
    abortControllerRef.current = new AbortController();
    
    // 开始执行批量操作
    executeBatchOperation(operation, items, comments);
  };

  // 执行批量操作 - 按照文档指导修正的实现
  const executeBatchOperation = async (
    operation: 'approve' | 'reject' | 'markPaid' | 'rollback', 
    items: BatchApprovalItem[],
    comments?: string
  ) => {
    try {
      const totalItems = items.length;
      let processedCount = 0;
      
      // 所有操作统一使用策略B：分批处理
      const batchSize = 5; // 每批处理5条记录
        
      for (let i = 0; i < totalItems; i += batchSize) {
          // 检查是否被取消
          if (abortControllerRef.current?.signal.aborted) {
            console.log('批量操作被取消');
            return;
          }
          
          const batch = selectedIds.slice(i, i + batchSize);
          
          // 更新当前批次状态为processing
          batch.forEach(payrollId => {
            setProgressItems(prev => updateBatchApprovalItem(prev, payrollId, {
              status: 'processing',
              message: '正在处理...'
            }));
            setCurrentItemId(payrollId);
          });
          
          try {
            // 执行真实的API调用并等待完成
            let results: any[] = [];
            
            switch (operation) {
              case 'approve':
                results = await new Promise((resolve) => {
                  mutations.approvePayrolls.mutate(
                    { payrollIds: batch, comments },
                    {
                      onSuccess: (data) => resolve(data),
                      onError: (error) => {
                        const errorResults = batch.map(payrollId => ({
                          payroll_id: payrollId,
                          success: false,
                          message: error.message
                        }));
                        resolve(errorResults);
                      }
                    }
                  );
                });
                break;
                
              case 'reject':
                results = await new Promise((resolve) => {
                  mutations.rejectPayrolls.mutate(
                    { payrollIds: batch, reason: comments || '批量驳回' },
                    {
                      onSuccess: (data) => resolve(data),
                      onError: (error) => {
                        const errorResults = batch.map(payrollId => ({
                          payroll_id: payrollId,
                          success: false,
                          message: error.message
                        }));
                        resolve(errorResults);
                      }
                    }
                  );
                });
                break;
                
              case 'markPaid':
                results = await new Promise((resolve) => {
                  mutations.markAsPaid.mutate(
                    { payrollIds: batch, comments },
                    {
                      onSuccess: (data) => resolve(data),
                      onError: (error) => {
                        const errorResults = batch.map(payrollId => ({
                          payroll_id: payrollId,
                          success: false,
                          message: error.message
                        }));
                        resolve(errorResults);
                      }
                    }
                  );
                });
                break;
                
              case 'rollback':
                results = await new Promise((resolve) => {
                  mutations.rollbackPayrolls.mutate(
                    { payrollIds: batch, reason: comments || '批量回滚' },
                    {
                      onSuccess: (data) => {
                        console.log(`回滚批次成功，批次大小: ${batch.length}, 返回结果:`, data);
                        resolve(data);
                      },
                      onError: (error) => {
                        console.error('回滚批次失败:', error);
                        const errorResults = batch.map(payrollId => ({
                          payroll_id: payrollId,
                          success: false,
                          message: error.message
                        }));
                        resolve(errorResults);
                      }
                    }
                  );
                });
                break;
            }
            
            // 根据真实结果更新每个项目的状态
            results.forEach((result: any) => {
              setProgressItems(prev => updateBatchApprovalItem(prev, result.payroll_id, {
                status: result.success ? 'completed' : 'error',
                message: result.message,
                error: result.success ? undefined : result.message
              }));
            });
            
          } catch (error) {
            // 处理批次错误
            batch.forEach(payrollId => {
              setProgressItems(prev => updateBatchApprovalItem(prev, payrollId, {
                status: 'error',
                error: error instanceof Error ? error.message : '处理失败'
              }));
            });
          }
          
          // 基于实际处理数量计算真实进度
          processedCount += batch.length;
          const progress = Math.min((processedCount / totalItems) * 100, 100);
          setTotalProgress(progress);
          setCurrentItemId(undefined);
          
          // 适当延迟以提供视觉反馈
          if (i + batchSize < totalItems) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      
      // 操作完成，触发成功回调
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
      
    } catch (error) {
      console.error('批量操作执行失败:', error);
      // 将所有剩余项目标记为错误
      setProgressItems(prev => prev.map(item => 
        item.status === 'pending' || item.status === 'processing' ? {
          ...item,
          status: 'error' as const,
          error: error instanceof Error ? error.message : '操作失败'
        } : item
      ));
      setTotalProgress(100);
    }
  };

  // 取消批量操作
  const cancelBatchOperation = () => {
    abortControllerRef.current?.abort();
    setShowProgressModal(false);
  };

  // 关闭进度模态框
  const closeProgressModal = () => {
    setShowProgressModal(false);
    setProgressItems([]);
    setCurrentItemId(undefined);
    setTotalProgress(0);
  };

  // 获取操作标题
  const getOperationTitle = (operation: 'approve' | 'reject' | 'markPaid' | 'rollback') => {
    const titles = {
      approve: '批量审批通过',
      reject: '批量驳回',
      markPaid: '批量标记发放',
      rollback: '批量回滚'
    };
    return titles[operation];
  };

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="text-sm text-base-content/70">
          已选择 <span className="font-bold text-primary">{selectedIds.length}</span> 条记录
        </div>
        
        <div className="divider divider-horizontal m-0"></div>
        
        {/* 审批通过按钮 */}
        {canApprove && (
          <button
            className="btn btn-success btn-sm"
            onClick={() => setShowApproveModal(true)}
            disabled={loading.approve}
          >
            {loading.approve && <span className="loading loading-spinner loading-xs"></span>}
            审批通过
          </button>
        )}

        {/* 驳回按钮 */}
        {canApprove && (
          <button
            className="btn btn-error btn-sm"
            onClick={() => setShowRejectModal(true)}
            disabled={loading.reject}
          >
            {loading.reject && <span className="loading loading-spinner loading-xs"></span>}
            驳回
          </button>
        )}

        {/* 标记发放按钮 */}
        {canMarkPaid && (
          <button
            className="btn btn-info btn-sm"
            onClick={handleMarkPaid}
            disabled={loading.markPaid}
          >
            {loading.markPaid && <span className="loading loading-spinner loading-xs"></span>}
            标记发放
          </button>
        )}

        {/* 取消按钮 */}
        {canCancel && (
          <button
            className="btn btn-warning btn-sm"
            onClick={handleCancel}
            disabled={loading.cancel}
          >
            {loading.cancel && <span className="loading loading-spinner loading-xs"></span>}
            取消
          </button>
        )}

        {/* 清空选择 */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onSuccess?.()}
        >
          清空选择
        </button>
      </div>

      {/* 审批通过模态框 */}
      {showApproveModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">批量审批</h3>
            <p className="py-2 text-sm text-base-content/70">
              即将审批通过 {selectedIds.length} 条薪资记录
            </p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">审批意见（可选）</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="请输入审批意见..."
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
              ></textarea>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-success"
                onClick={handleApprove}
                disabled={loading.approve}
              >
                {loading.approve && <span className="loading loading-spinner loading-xs"></span>}
                确认通过
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setShowApproveModal(false);
                  setApproveComments('');
                }}
              >
                取消
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowApproveModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* 驳回模态框 */}
      {showRejectModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">批量驳回</h3>
            <p className="py-2 text-sm text-base-content/70">
              即将驳回 {selectedIds.length} 条薪资记录
            </p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  驳回原因 <span className="text-error">*</span>
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="请输入驳回原因..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              ></textarea>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-error"
                onClick={handleReject}
                disabled={loading.reject || !rejectReason.trim()}
              >
                {loading.reject && <span className="loading loading-spinner loading-xs"></span>}
                确认驳回
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                取消
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowRejectModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* 批量审批进度模态框 */}
      <BatchApprovalProgressModal
        isOpen={showProgressModal}
        onClose={closeProgressModal}
        title={getOperationTitle(currentOperation)}
        operationType={currentOperation}
        items={progressItems}
        currentItemId={currentItemId}
        totalProgress={totalProgress}
        allowCancel={totalProgress < 100 && totalProgress > 0}
        onCancel={cancelBatchOperation}
        summary={progressItems.length > 0 ? calculateBatchSummary(progressItems) : undefined}
      />
    </>
  );
}