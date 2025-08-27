import { useState, useCallback, useRef } from 'react';
import { usePayrollApproval } from '@/hooks/payroll/usePayrollApproval';
import { useBatchInsuranceCalculation } from '@/hooks/insurance';
import { usePayrollCalculation } from '@/hooks/payroll/usePayrollCalculation';
import { useToast } from '@/contexts/ToastContext';
import { 
  createBatchApprovalItems,
  updateBatchApprovalItem,
  type BatchApprovalItem 
} from '@/components/payroll';

// 批量操作进度状态类型
interface BatchProgressModal {
  open: boolean;
  items: BatchApprovalItem[];
  currentItemId?: string;
  totalProgress: number;
  allowCancel: boolean;
}

// 提交审批进度模态框状态
interface SubmitProgressModal extends BatchProgressModal {}

// 计算进度模态框状态
interface CalculationProgressModal extends BatchProgressModal {
  type: 'insurance' | 'payroll';
}

// 确认模态框状态
interface ConfirmModalState {
  open: boolean;
  type: 'submit';
  loading: boolean;
}

// Hook返回值类型
interface BatchOperationsManager {
  // 模态框状态
  confirmModal: ConfirmModalState;
  submitProgressModal: SubmitProgressModal;
  calculationProgressModal: CalculationProgressModal;
  
  // 模态框操作
  setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>;
  setSubmitProgressModal: React.Dispatch<React.SetStateAction<SubmitProgressModal>>;
  setCalculationProgressModal: React.Dispatch<React.SetStateAction<CalculationProgressModal>>;
  
  // 批量操作函数
  handleBatchSubmit: (selectedIds: string[], allData: any[]) => Promise<void>;
  handleBatchCalculateInsurance: (selectedIds: string[], processedData: any[], selectedPeriodId: string, isCompletenessReady: boolean) => Promise<void>;
  handleBatchCalculatePayroll: (selectedIds: string[], processedData: any[], isCompletenessReady: boolean) => Promise<void>;
  
  // 进度操作函数
  cancelSubmitOperation: () => void;
  closeSubmitProgressModal: () => void;
  closeCalculationProgressModal: () => void;
  
  // 加载状态
  isAnyOperationLoading: boolean;
}

/**
 * 批量操作管理Hook
 * 抽离了PayrollListPage中复杂的批量操作逻辑，包括：
 * 1. 批量提交审批
 * 2. 批量计算五险一金
 * 3. 批量计算薪资汇总
 * 4. 进度模态框管理
 * 5. 错误处理和用户反馈
 */
export function useBatchOperationsManager(onRefetch?: () => void): BatchOperationsManager {
  const { showSuccess, showError } = useToast();
  const approval = usePayrollApproval();
  const { calculateBatchInsurance, loading: batchInsuranceLoading } = useBatchInsuranceCalculation();
  const payrollCalculation = usePayrollCalculation();
  
  // 取消控制器引用
  const submitAbortControllerRef = useRef<AbortController | null>(null);

  // 确认模态框状态
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    type: 'submit',
    loading: false
  });

  // 提交审批进度模态框状态
  const [submitProgressModal, setSubmitProgressModal] = useState<SubmitProgressModal>({
    open: false,
    items: [],
    currentItemId: '',
    totalProgress: 0,
    allowCancel: true
  });

  // 计算进度模态框状态
  const [calculationProgressModal, setCalculationProgressModal] = useState<CalculationProgressModal>({
    open: false,
    type: 'insurance',
    items: [],
    currentItemId: '',
    totalProgress: 0,
    allowCancel: true
  });

  // 处理批量提交审批
  const handleBatchSubmit = useCallback(async (selectedIds: string[], allData: any[]) => {
    if (selectedIds.length === 0) {
      showError('请选择要提交的记录');
      return;
    }

    // 关闭确认模态框
    setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
    
    // 启动提交操作
    const selectedPayrollData = (allData || []).filter((payroll: any) => 
      selectedIds.includes(payroll.payroll_id)
    );
    
    // 创建批量提交项目
    const items = createBatchApprovalItems(
      selectedPayrollData.length > 0 ? 
        selectedPayrollData.map((payroll: any) => ({
          payroll_id: payroll.payroll_id || payroll.id,
          employee_name: payroll.employee_name || '未知员工',
          net_pay: payroll.net_pay || 0
        })) : 
        selectedIds.map(id => ({
          payroll_id: id,
          employee_name: '未知员工',
          net_pay: 0
        }))
    );
    
    setSubmitProgressModal({
      open: true,
      items,
      currentItemId: undefined,
      totalProgress: 0,
      allowCancel: true
    });
    
    // 创建新的取消控制器
    submitAbortControllerRef.current = new AbortController();
    
    // 开始执行提交操作
    await executeSubmitOperation(selectedIds, items);
  }, [showError]);

  // 执行提交操作
  const executeSubmitOperation = useCallback(async (selectedIds: string[], items: BatchApprovalItem[]) => {
    try {
      const batchSize = 5; // 每批处理5条记录
      const totalItems = items.length;
      let processedCount = 0;
      
      // 分批处理以显示进度
      for (let i = 0; i < totalItems; i += batchSize) {
        // 检查是否被取消
        if (submitAbortControllerRef.current?.signal.aborted) {
          console.log('提交操作被取消');
          return;
        }
        
        const batch = selectedIds.slice(i, i + batchSize);
        
        // 更新当前处理项目的状态为processing
        batch.forEach(payrollId => {
          setSubmitProgressModal(prev => ({
            ...prev,
            items: updateBatchApprovalItem(prev.items, payrollId, {
              status: 'processing',
              message: '正在提交...'
            }),
            currentItemId: payrollId
          }));
        });
        
        try {
          // 执行提交操作
          const results = await new Promise<any>((resolve) => {
            approval.mutations.submitForApproval.mutate(
              { payrollIds: batch, comments: '批量提交审批' },
              {
                onSuccess: (data) => resolve(data),
                onError: (error) => {
                  // 处理错误情况
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
          
          // 更新结果状态
          results.forEach((result: any) => {
            setSubmitProgressModal(prev => ({
              ...prev,
              items: updateBatchApprovalItem(prev.items, result.payroll_id, {
                status: result.success ? 'completed' : 'error',
                message: result.message,
                error: result.success ? undefined : result.message
              })
            }));
          });
          
        } catch (error) {
          // 处理批次错误
          batch.forEach(payrollId => {
            setSubmitProgressModal(prev => ({
              ...prev,
              items: updateBatchApprovalItem(prev.items, payrollId, {
                status: 'error',
                error: error instanceof Error ? error.message : '提交失败'
              })
            }));
          });
        }
        
        processedCount += batch.length;
        const progress = Math.min((processedCount / totalItems) * 100, 100);
        setSubmitProgressModal(prev => ({
          ...prev,
          totalProgress: progress,
          currentItemId: undefined
        }));
        
        // 短暂延迟以显示进度效果
        if (i + batchSize < totalItems) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // 操作完成，触发刷新
      setTimeout(() => {
        if (onRefetch) {
          onRefetch();
        }
      }, 1000);
      
    } catch (error) {
      console.error('提交操作执行失败:', error);
      // 将所有剩余项目标记为错误
      setSubmitProgressModal(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.status === 'pending' || item.status === 'processing' ? {
            ...item,
            status: 'error' as const,
            error: error instanceof Error ? error.message : '操作失败'
          } : item
        ),
        totalProgress: 100
      }));
    }
  }, [approval.mutations.submitForApproval, onRefetch]);

  // 批量计算五险一金
  const handleBatchCalculateInsurance = useCallback(async (
    selectedIds: string[], 
    processedData: any[], 
    selectedPeriodId: string,
    isCompletenessReady: boolean
  ) => {
    if (!selectedPeriodId) {
      showError('请先选择薪资周期');
      return;
    }

    if (selectedIds.length === 0) {
      showError('请选择要计算的记录');
      return;
    }

    if (!isCompletenessReady) {
      showError('四要素完整度未达到100%，无法执行重算操作');
      return;
    }

    // 在外层声明变量，确保在 catch 块中也能访问
    let totalSuccessCount = 0;
    let totalItems = 0;
    
    try {
      // 从选中的薪资记录中提取员工ID和名称
      const selectedRecords = processedData
        .filter(p => selectedIds.includes(p.id || p.payroll_id || ''))
        .filter(p => p.employee_id && p.employee_name);

      if (selectedRecords.length === 0) {
        showError('未找到对应的员工信息');
        return;
      }

      const employeeIds = selectedRecords.map(p => p.employee_id).filter(Boolean) as string[];

      // 创建批量项目
      const batchItems = createBatchApprovalItems(
        selectedRecords.map(record => ({
          payroll_id: record.id || record.payroll_id || '',
          employee_name: record.employee_name || '',
          net_pay: 0 // 五险一金计算不涉及实发工资显示
        }))
      );

      // 打开进度模态框
      setCalculationProgressModal({
        open: true,
        type: 'insurance',
        items: batchItems,
        totalProgress: 0,
        allowCancel: true
      });

      // 批量计算五险一金
      const batchSize = 5;
      totalItems = employeeIds.length; // 赋值给外层变量
      let processedCount = 0;

      for (let i = 0; i < totalItems; i += batchSize) {
        const batch = employeeIds.slice(i, i + batchSize);
        const batchRecords = selectedRecords.slice(i, i + batchSize);

        // 更新当前批次状态
        batchRecords.forEach(record => {
          const recordId = record.id || record.payroll_id || '';
          setCalculationProgressModal(prev => ({
            ...prev,
            items: updateBatchApprovalItem(prev.items, recordId, {
              status: 'processing',
              message: '正在计算五险一金...'
            }),
            currentItemId: recordId
          }));
        });

        try {
          // 执行批量计算
          const results = await calculateBatchInsurance({
            periodId: selectedPeriodId,
            employeeIds: batch,
            includeOccupationalPension: true,
            saveToDatabase: true
          });

          // 统计当前批次的成功数量
          const batchSuccessCount = results.filter(r => r.success).length;
          totalSuccessCount += batchSuccessCount;

          // 处理结果 - 基于实际的计算结果更新UI状态
          results.forEach((result, index) => {
            const record = batchRecords[index];
            const recordId = record?.id || record?.payroll_id || '';
            if (recordId) {
              setCalculationProgressModal(prev => ({
                ...prev,
                items: updateBatchApprovalItem(prev.items, recordId, {
                  status: result.success ? 'completed' : 'error',
                  message: result.success ? `五险一金计算成功 (${result.itemsInserted}项)` : result.message,
                  error: result.success ? undefined : result.message
                })
              }));
            }
          });

          console.log(`批次 ${Math.floor(i / batchSize) + 1} 计算完成: 成功${batchSuccessCount}/${batch.length}, 累计成功${totalSuccessCount}/${processedCount + batch.length}`);

        } catch (error) {
          // 处理批次错误 - 当前批次全部标记为失败
          console.error(`批次 ${Math.floor(i / batchSize) + 1} 执行失败:`, error);
          batchRecords.forEach(record => {
            const recordId = record.id || record.payroll_id || '';
            setCalculationProgressModal(prev => ({
              ...prev,
              items: updateBatchApprovalItem(prev.items, recordId, {
                status: 'error',
                error: error instanceof Error ? error.message : '计算失败'
              })
            }));
          });
        }

        // 更新总体进度
        processedCount += batch.length;
        const progress = Math.min((processedCount / totalItems) * 100, 100);
        setCalculationProgressModal(prev => ({
          ...prev,
          totalProgress: progress,
          currentItemId: undefined
        }));

        console.log(`批次 ${Math.floor(i / batchSize) + 1} 完成，总进度: ${progress.toFixed(1)}%`);

        // 批次间延迟
        if (i + batchSize < totalItems) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // 使用真实的成功数量而不是UI状态
      showSuccess(`批量计算五险一金完成: 成功 ${totalSuccessCount}/${totalItems} 条记录`);
      if (onRefetch) {
        onRefetch();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('批量计算五险一金完全失败:', error);
      
      // 如果有部分成功的记录，应该显示部分成功的信息而不是完全失败
      if (totalSuccessCount > 0) {
        showError(`批量计算五险一金部分失败: 成功 ${totalSuccessCount}/${totalItems} 条记录. 错误: ${errorMessage}`);
      } else {
        showError(`批量计算五险一金失败: ${errorMessage}`);
      }
      
      setCalculationProgressModal(prev => ({
        ...prev,
        allowCancel: false,
        items: prev.items.map(item => 
          item.status === 'pending' || item.status === 'processing' ? {
            ...item,
            status: 'error' as const,
            error: errorMessage
          } : item
        ),
        totalProgress: 100
      }));
    }
  }, [calculateBatchInsurance, showSuccess, showError, onRefetch]);

  // 批量计算薪资汇总
  const handleBatchCalculatePayroll = useCallback(async (
    selectedIds: string[], 
    processedData: any[],
    isCompletenessReady: boolean
  ) => {
    if (selectedIds.length === 0) {
      showError('请选择要计算的记录');
      return;
    }

    if (!isCompletenessReady) {
      showError('四要素完整度未达到100%，无法执行重算操作');
      return;
    }

    try {
      // 准备选中记录的数据
      const selectedRecords = processedData
        .filter(p => selectedIds.includes(p.id || p.payroll_id || ''))
        .filter(p => p.employee_name);

      if (selectedRecords.length === 0) {
        showError('未找到对应的记录信息');
        return;
      }

      // 创建批量项目
      const batchItems = createBatchApprovalItems(
        selectedRecords.map(record => ({
          payroll_id: record.id || record.payroll_id || '',
          employee_name: record.employee_name || '',
          net_pay: record.net_pay || 0
        }))
      );

      // 打开进度模态框
      setCalculationProgressModal({
        open: true,
        type: 'payroll',
        items: batchItems,
        totalProgress: 0,
        allowCancel: true
      });

      // 批量计算薪资汇总 - 策略B: 分批处理
      const batchSize = 5;
      const totalItems = selectedIds.length;
      let processedCount = 0;
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < totalItems; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        const batchRecords = selectedRecords.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(totalItems / batchSize);

        console.log(`处理薪资汇总第${currentBatch}/${totalBatches}批, 包含${batch.length}条记录`);

        // 更新当前批次状态为处理中
        batchRecords.forEach(record => {
          const recordId = record.id || record.payroll_id || '';
          setCalculationProgressModal(prev => ({
            ...prev,
            items: updateBatchApprovalItem(prev.items, recordId, {
              status: 'processing',
              message: '正在计算薪资汇总...'
            }),
            currentItemId: recordId
          }));
        });

        try {
          // 执行当前批次的薪资汇总计算
          console.log(`执行薪资汇总批次${currentBatch}计算，记录IDs:`, batch);
          console.log('=== 批量计算开始 ===');
          const result = await payrollCalculation.calculateBatch(batch, true);
          console.log('=== 批量计算结果 ===', result);
          console.log('成功数量:', result.summary.successCount);
          console.log('失败数量:', result.summary.failureCount);
          console.log('总扣除额:', result.summary.totalDeductions);

          // 处理批次结果
          const batchSuccessCount = result.summary.successCount;
          const batchFailureCount = result.summary.failureCount;
          
          successCount += batchSuccessCount;
          failureCount += batchFailureCount;

          // 更新批次中每条记录的状态 
          batchRecords.forEach((record, index) => {
            const recordId = record.id || record.payroll_id || '';
            const isSuccess = index < batchSuccessCount; // 简化处理，假设前N个成功
            setCalculationProgressModal(prev => ({
              ...prev,
              items: updateBatchApprovalItem(prev.items, recordId, {
                status: isSuccess ? 'completed' : 'error',
                message: isSuccess ? '薪资汇总计算完成' : result.summary.failureCount > 0 ? '薪资汇总计算失败' : '薪资汇总计算完成',
                error: isSuccess ? undefined : '计算失败'
              })
            }));
          });

          console.log(`薪资汇总批次${currentBatch}完成: 成功${batchSuccessCount}, 失败${batchFailureCount}`);

        } catch (error) {
          // 处理批次错误
          console.error(`薪资汇总批次${currentBatch}失败:`, error);
          failureCount += batch.length;
          
          batchRecords.forEach(record => {
            const recordId = record.id || record.payroll_id || '';
            setCalculationProgressModal(prev => ({
              ...prev,
              items: updateBatchApprovalItem(prev.items, recordId, {
                status: 'error',
                error: error instanceof Error ? error.message : '计算失败'
              })
            }));
          });
        }

        // 更新总体进度
        processedCount += batch.length;
        const progress = Math.min((processedCount / totalItems) * 100, 100);
        setCalculationProgressModal(prev => ({
          ...prev,
          totalProgress: progress,
          currentItemId: undefined
        }));

        console.log(`薪资汇总批次 ${currentBatch} 完成，总进度: ${progress.toFixed(1)}%`);

        // 批次间延迟
        if (i + batchSize < totalItems) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (successCount > 0) {
        showSuccess(`批量计算薪资汇总完成: 成功 ${successCount}/${totalItems} 条记录`);
        if (onRefetch) {
          onRefetch();
        }
      } else {
        throw new Error('薪资汇总计算失败');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      showError(`批量计算薪资汇总失败: ${errorMessage}`);
      setCalculationProgressModal(prev => ({
        ...prev,
        allowCancel: false,
        items: prev.items.map(item => 
          item.status === 'pending' || item.status === 'processing' ? {
            ...item,
            status: 'error' as const,
            error: errorMessage
          } : item
        ),
        totalProgress: 100
      }));
    }
  }, [payrollCalculation, showSuccess, showError, onRefetch]);

  // 取消提交操作
  const cancelSubmitOperation = useCallback(() => {
    submitAbortControllerRef.current?.abort();
    setSubmitProgressModal(prev => ({ ...prev, open: false }));
  }, []);

  // 关闭提交进度模态框
  const closeSubmitProgressModal = useCallback(() => {
    setSubmitProgressModal({
      open: false,
      items: [],
      currentItemId: '',
      totalProgress: 0,
      allowCancel: true
    });
  }, []);

  // 关闭计算进度模态框
  const closeCalculationProgressModal = useCallback(() => {
    setCalculationProgressModal(prev => ({ ...prev, open: false }));
  }, []);

  // 检查是否有任何操作正在进行
  const isAnyOperationLoading = batchInsuranceLoading || payrollCalculation.loading;

  return {
    // 模态框状态
    confirmModal,
    submitProgressModal,
    calculationProgressModal,
    
    // 模态框操作
    setConfirmModal,
    setSubmitProgressModal,
    setCalculationProgressModal,
    
    // 批量操作函数
    handleBatchSubmit,
    handleBatchCalculateInsurance,
    handleBatchCalculatePayroll,
    
    // 进度操作函数
    cancelSubmitOperation,
    closeSubmitProgressModal,
    closeCalculationProgressModal,
    
    // 加载状态
    isAnyOperationLoading
  };
}