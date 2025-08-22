import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  PayrollDetailModal, 
  ApprovalHistoryModal, 
  PayrollBatchActions,
  PayrollTableContainer,
  PayrollSearchAndFilter,
  PayrollPeriodSelector
} from '@/components/payroll';
import { CompactPayrollStatusSelector } from '@/components/payroll/PayrollStatusSelector';
import { usePayrollRealtime } from '@/hooks/core/useSupabaseRealtime';
import { usePayrollApproval } from '@/hooks/payroll';
import { usePayrollPeriodSelection } from '@/hooks/payroll/usePayrollPeriodSelection';
import { usePayrollDataProcessor } from '@/hooks/payroll/usePayrollDataProcessor';
import { usePayrollBatchValidation } from '@/hooks/payroll/usePayrollBatchValidation';
import { usePayrollModalManager } from '@/hooks/payroll/usePayrollModalManager';
import { formatCurrency } from '@/lib/format';
import { formatMonth } from '@/lib/dateUtils';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmModal, BatchConfirmModal, RollbackConfirmModal } from '@/components/common/ConfirmModal';
import { BatchApprovalProgressModal, createBatchApprovalItems, updateBatchApprovalItem, calculateBatchSummary } from '@/components/payroll/BatchApprovalProgressModal';
import type { BatchApprovalItem } from '@/components/payroll/BatchApprovalProgressModal';
import type { PayrollApprovalSummary } from '@/hooks/payroll/usePayrollApproval';
import type { Database } from '@/types/supabase';
import type { BasePayrollData } from '@/components/payroll/PayrollTableContainer';
import { createDataTableColumnHelper } from '@/components/common/DataTable/utils';
import { PayrollStatusBadge } from '@/components/common/PayrollStatusBadge';

type PayrollStatus = Database['public']['Enums']['payroll_status'];

// 扩展接口以支持审批页面特定需求
interface PayrollApprovalData extends BasePayrollData {
  // 审批页面特有的字段
}

/**
 * 薪资审批管理页面
 * 展示完整的审批流程管理功能
 */
export default function PayrollApprovalPage() {
  const { t } = useTranslation(['common', 'payroll']);
  const { showSuccess, showError } = useToast();
  
  // 使用通用模态框管理Hook
  const modalManager = usePayrollModalManager<PayrollApprovalData>();
  
  // 设置 Realtime 订阅以自动刷新审批数据
  usePayrollRealtime({
    enabled: true,
    showNotifications: true, // 审批页面显示通知，重要状态变更需要提醒
    onSuccess: (event, payload) => {
      console.log(`[PayrollApproval] Realtime event: ${event}`, payload);
      // 当有薪资状态变更时，自动刷新审批列表
    },
    onError: (error) => {
      console.error('[PayrollApproval] Realtime error:', error);
    }
  });
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | 'all'>('pending'); // 默认显示待审批状态
  
  // 确认模态框状态
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'approve' | 'paid' | 'rollback';
    loading: boolean;
  }>({ open: false, type: 'approve', loading: false });

  // 批量进度模态框状态
  const [progressModal, setProgressModal] = useState<{
    open: boolean;
    type: 'approve' | 'markPaid' | 'rollback';
    items: BatchApprovalItem[];
    currentItemId?: string;
    totalProgress: number;
    allowCancel: boolean;
  }>({
    open: false,
    type: 'approve',
    items: [],
    currentItemId: '',
    totalProgress: 0,
    allowCancel: true
  });
  
  const { queries, actions, utils, loading, mutations } = usePayrollApproval();
  
  // 使用智能周期选择hook
  const {
    selectedPeriodId,
    selectedMonth,
    isInitialized,
    isLoadingMonths,
    availableMonths,
    updateSelectedMonth,
    isLoading: isPeriodLoading,
    hasValidSelection
  } = usePayrollPeriodSelection('payroll-approval');
  
  // 获取统计数据（根据选中周期筛选）
  const { data: stats, isLoading: statsLoading } = queries.useApprovalStats(selectedPeriodId);
  
  // 根据状态筛选获取审批列表
  const approvalFilters = {
    periodId: selectedPeriodId,
    ...(statusFilter !== 'all' && { status: statusFilter })
  };
  const { data: rawApprovalList, isLoading: approvalLoading } = queries.useApprovalSummary(approvalFilters);
  
  // 使用数据处理Hook
  const dataProcessor = usePayrollDataProcessor<PayrollApprovalData>(rawApprovalList || [], {
    searchQuery,
    statusFilter,
    statusField: 'status', // 明确指定使用 'status' 字段
    ensureCompatibility: true,
  });
  
  // 使用批量验证Hook
  const batchValidation = usePayrollBatchValidation(selectedIds, dataProcessor.processedData);
  

  // 创建表格列定义 - 与薪资管理页面保持一致
  const columnHelper = createDataTableColumnHelper<PayrollApprovalData>();
  const columns = useMemo(() => [
    columnHelper.accessor('employee_name', {
      header: '员工姓名',
      cell: (info) => info.getValue()
    }),
    columnHelper.accessor('department_name', {
      header: '部门',
      cell: (info) => info.getValue() || '-'
    }),
    columnHelper.accessor('position_name', {
      header: '职位',
      cell: (info) => info.getValue() || '-'
    }),
    columnHelper.accessor('category_name', {
      header: '人员类别',
      cell: (info) => info.getValue() || '-'
    }),
    columnHelper.accessor('gross_pay', {
      header: '应发合计',
      cell: (info) => formatCurrency(info.getValue() || 0)
    }),
    columnHelper.accessor('total_deductions', {
      header: '扣发合计',
      cell: (info) => formatCurrency(info.getValue() || 0)
    }),
    columnHelper.accessor('net_pay', {
      header: '实发合计',
      cell: (info) => formatCurrency(info.getValue() || 0)
    }),
    columnHelper.accessor('status', {
      header: '状态',
      cell: (info) => (
        <PayrollStatusBadge status={info.getValue() as any} />
      )
    })
  ], [columnHelper]);
  
  // 计算实际的待审批列表（当状态筛选为'all'时显示所有状态，否则按筛选状态显示）
  const pendingList = statusFilter === 'all' 
    ? rawApprovalList  // 显示所有状态
    : rawApprovalList;
  
  const pendingLoading = approvalLoading;

  // 计算当前筛选状态的统计数据
  const currentFilterStats = useMemo(() => {
    const filteredData = dataProcessor.processedData || [];
    const count = filteredData.length;
    const amount = filteredData.reduce((sum, item) => sum + (item.net_pay || 0), 0);
    
    return { count, amount };
  }, [dataProcessor.processedData]);
  
  // 计算全部状态统计（用于状态筛选为'all'时显示）
  const allStatsData = useMemo(() => {
    if (statusFilter === 'all') {
      return {
        pending: (stats?.draft || 0) + (stats?.calculated || 0) + (stats?.pending || 0),
        approved: stats?.approved || 0,
        paid: stats?.paid || 0,
        cancelled: stats?.cancelled || 0,
        pendingAmount: rawApprovalList?.filter(item => ['draft', 'calculating', 'calculated', 'pending'].includes(item.status))
          .reduce((sum, item) => sum + (item.net_pay || 0), 0) || 0
      };
    } else {
      // 当前筛选状态下，只显示当前状态的数据
      return {
        pending: statusFilter === 'pending' ? currentFilterStats.count : 0,
        approved: statusFilter === 'approved' ? currentFilterStats.count : 0, 
        paid: statusFilter === 'paid' ? currentFilterStats.count : 0,
        cancelled: statusFilter === 'cancelled' ? currentFilterStats.count : 0,
        pendingAmount: currentFilterStats.amount
      };
    }
  }, [statusFilter, stats, currentFilterStats, rawApprovalList]);


  // 处理批量审批 - 按照文档指导修正的实现
  const handleBatchApprove = useCallback(async () => {
    if (selectedIds.length === 0) {
      showError('请选择要审批的记录');
      return;
    }

    // 准备批量审批数据
    const selectedRecords = dataProcessor.processedData.filter(record => 
      record.payroll_id && selectedIds.includes(record.payroll_id)
    );
    
    const batchItems = createBatchApprovalItems(
      selectedRecords
        .filter(record => record.payroll_id && record.employee_name)
        .map(record => ({
          payroll_id: record.payroll_id!,
          employee_name: record.employee_name!,
          net_pay: record.net_pay || 0
      }))
    );

    // 关闭确认模态框，显示进度模态框
    setConfirmModal(prev => ({ ...prev, open: false }));
    setProgressModal({
      open: true,
      type: 'approve',
      items: batchItems,
      totalProgress: 0,
      allowCancel: true
    });

    try {
      // 审批操作：使用分批处理模式
      const batchSize = 5;
      const totalItems = batchItems.length;
      let processedCount = 0;
      
      for (let i = 0; i < totalItems; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        
        // 更新当前批次状态为processing
        batch.forEach(payrollId => {
          setProgressModal(prev => ({
            ...prev,
            items: updateBatchApprovalItem(prev.items, payrollId, {
              status: 'processing',
              message: '正在审批...'
            }),
            currentItemId: payrollId
          }));
        });
        
        try {
          // 执行真实的API调用并等待完成
          const results = await new Promise<any[]>((resolve) => {
            actions.approve(batch, '批量审批');
            // 模拟等待审批完成的结果
            setTimeout(() => {
              resolve(batch.map(payrollId => ({
                payroll_id: payrollId,
                success: true,
                message: '审批成功'
              })));
            }, 800);
          });
          
          // 根据真实结果更新每个项目的状态
          results.forEach((result: any) => {
            setProgressModal(prev => ({
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
            setProgressModal(prev => ({
              ...prev,
              items: updateBatchApprovalItem(prev.items, payrollId, {
                status: 'error',
                error: error instanceof Error ? error.message : '审批失败'
              })
            }));
          });
        }
        
        // 基于实际处理数量计算真实进度
        processedCount += batch.length;
        const progress = Math.min((processedCount / totalItems) * 100, 100);
        setProgressModal(prev => ({
          ...prev,
          totalProgress: progress,
          currentItemId: undefined
        }));
        
        // 适当延迟以提供视觉反馈
        if (i + batchSize < totalItems) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      showSuccess(`批量审批完成: 成功审批 ${selectedIds.length} 条记录`);
      setSelectedIds([]);
      
    } catch (error) {
      showError('批量审批过程中发生错误');
      setProgressModal(prev => ({
        ...prev,
        allowCancel: false,
        items: prev.items.map(item => 
          item.status === 'pending' || item.status === 'processing' ? {
            ...item,
            status: 'error' as const,
            error: error instanceof Error ? error.message : '审批失败'
          } : item
        ),
        totalProgress: 100
      }));
    }
  }, [selectedIds, dataProcessor.processedData, actions, showSuccess, showError]);

  // 处理批量标记已发放 - 按照文档指导修正的实现
  const handleBatchMarkPaid = useCallback(async () => {
    if (selectedIds.length === 0) {
      showError('请选择要标记为已发放的记录');
      return;
    }

    // 准备批量发放数据
    const selectedRecords = dataProcessor.processedData.filter(record => 
      record.payroll_id && selectedIds.includes(record.payroll_id)
    );
    
    const batchItems = createBatchApprovalItems(
      selectedRecords
        .filter(record => record.payroll_id && record.employee_name)
        .map(record => ({
          payroll_id: record.payroll_id!,
          employee_name: record.employee_name!,
          net_pay: record.net_pay || 0
        }))
    );

    // 关闭确认模态框，显示进度模态框
    setConfirmModal(prev => ({ ...prev, open: false }));
    setProgressModal({
      open: true,
      type: 'markPaid',
      items: batchItems,
      totalProgress: 0,
      allowCancel: true
    });

    try {
      // 标记发放操作：使用分批处理模式
      const batchSize = 5;
      const totalItems = batchItems.length;
      let processedCount = 0;
      
      for (let i = 0; i < totalItems; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        
        // 更新当前批次状态为processing
        batch.forEach(payrollId => {
          setProgressModal(prev => ({
            ...prev,
            items: updateBatchApprovalItem(prev.items, payrollId, {
              status: 'processing',
              message: '正在标记发放...'
            }),
            currentItemId: payrollId
          }));
        });
        
        try {
          // 执行真实的API调用并等待完成
          const results = await new Promise<any[]>((resolve) => {
            actions.markPaid(batch, '批量标记发放');
            // 模拟等待标记完成的结果
            setTimeout(() => {
              resolve(batch.map(payrollId => ({
                payroll_id: payrollId,
                success: true,
                message: '发放成功'
              })));
            }, 800);
          });
          
          // 根据真实结果更新每个项目的状态
          results.forEach((result: any) => {
            setProgressModal(prev => ({
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
            setProgressModal(prev => ({
              ...prev,
              items: updateBatchApprovalItem(prev.items, payrollId, {
                status: 'error',
                error: error instanceof Error ? error.message : '发放失败'
              })
            }));
          });
        }
        
        // 基于实际处理数量计算真实进度
        processedCount += batch.length;
        const progress = Math.min((processedCount / totalItems) * 100, 100);
        setProgressModal(prev => ({
          ...prev,
          totalProgress: progress,
          currentItemId: undefined
        }));
        
        // 适当延迟以提供视觉反馈
        if (i + batchSize < totalItems) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      showSuccess(`批量发放完成: 成功发放 ${selectedIds.length} 条记录`);
      setSelectedIds([]);
      
    } catch (error) {
      showError('批量发放过程中发生错误');
      setProgressModal(prev => ({
        ...prev,
        allowCancel: false,
        items: prev.items.map(item => 
          item.status === 'pending' || item.status === 'processing' ? {
            ...item,
            status: 'error' as const,
            error: error instanceof Error ? error.message : '发放失败'
          } : item
        ),
        totalProgress: 100
      }));
    }
  }, [selectedIds, dataProcessor.processedData, actions, showSuccess, showError]);

  // 处理批量回滚 - 按照文档指导修正的实现
  const handleBatchRollback = useCallback(async (reason: string) => {
    if (selectedIds.length === 0) {
      showError('请选择要回滚的记录');
      return;
    }

    // 准备批量回滚数据
    const selectedRecords = dataProcessor.processedData.filter(record => 
      record.payroll_id && selectedIds.includes(record.payroll_id)
    );
    
    const batchItems = createBatchApprovalItems(
      selectedRecords
        .filter(record => record.payroll_id && record.employee_name)
        .map(record => ({
          payroll_id: record.payroll_id!,
          employee_name: record.employee_name!,
          net_pay: record.net_pay || 0
        }))
    );

    // 关闭确认模态框，显示进度模态框
    setConfirmModal(prev => ({ ...prev, open: false }));
    setProgressModal({
      open: true,
      type: 'rollback',
      items: batchItems,
      totalProgress: 0,
      allowCancel: true
    });

    try {
      // 回滚操作：采用分批处理模式（策略B）
      const batchSize = 5;
      const totalItems = selectedIds.length;
      let processedCount = 0;

      // 分批处理循环
      for (let i = 0; i < totalItems; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(totalItems / batchSize);

        console.log(`处理回滚第${currentBatch}/${totalBatches}批, 包含${batch.length}条记录`);

        // 更新当前批次状态为处理中
        setProgressModal(prev => ({
          ...prev,
          currentItemId: batch[0],
          items: prev.items.map(item => 
            batch.includes(item.payroll_id) ? {
              ...item,
              status: 'processing' as const,
              message: '正在回滚...'
            } : item
          )
        }));

        try {
          // 执行当前批次的API调用
          const results = await new Promise<any[]>((resolve) => {
            mutations.rollbackPayrolls.mutate(
              { payrollIds: batch, reason: reason },
              {
                onSuccess: (data) => {
                  console.log(`回滚批次${currentBatch}成功，返回:`, data);
                  resolve(data);
                },
                onError: (error) => {
                  console.error(`回滚批次${currentBatch}失败:`, error);
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

          // 更新当前批次的结果状态
          setProgressModal(prev => ({
            ...prev,
            items: prev.items.map(item => {
              const result = results.find(r => r.payroll_id === item.payroll_id);
              if (result) {
                return {
                  ...item,
                  status: result.success ? 'completed' as const : 'error' as const,
                  message: result.message || '回滚完成',
                  error: result.success ? undefined : result.message
                };
              }
              return item;
            })
          }));

          processedCount += batch.length;
          const progress = Math.min((processedCount / totalItems) * 100, 100);
          
          setProgressModal(prev => ({
            ...prev,
            totalProgress: progress
          }));

        } catch (error) {
          // 处理批次异常错误
          console.error(`回滚批次${currentBatch}异常:`, error);
          setProgressModal(prev => ({
            ...prev,
            items: prev.items.map(item => 
              batch.includes(item.payroll_id) ? {
                ...item,
                status: 'error' as const,
                error: error instanceof Error ? error.message : '回滚失败'
              } : item
            )
          }));
          
          processedCount += batch.length;
          const progress = Math.min((processedCount / totalItems) * 100, 100);
          setProgressModal(prev => ({
            ...prev,
            totalProgress: progress
          }));
        }
      }

      // 完成所有批次后的最终状态更新
      setProgressModal(prev => ({
        ...prev,
        allowCancel: false,
        currentItemId: undefined
      }));

      const successCount = progressModal.items.filter(item => item.status === 'completed').length;
      showSuccess(`批量回滚完成: 成功回滚 ${successCount} 条记录`);
      setSelectedIds([]);
      
    } catch (error) {
      showError('批量回滚过程中发生错误');
      setProgressModal(prev => ({
        ...prev,
        allowCancel: false,
        items: prev.items.map(item => 
          item.status === 'pending' || item.status === 'processing' ? {
            ...item,
            status: 'error' as const,
            error: error instanceof Error ? error.message : '回滚失败'
          } : item
        ),
        totalProgress: 100
      }));
    }
  }, [selectedIds, dataProcessor.processedData, actions, showSuccess, showError]);

  const isLoading = approvalLoading || statsLoading || isPeriodLoading;

  return (
    <ManagementPageLayout
      title="薪资审批"
      loading={isLoading}
      exportComponent={null}
      customContent={
        <div className="space-y-6">
          {/* 薪资审批统计概览 - 使用 DaisyUI 标准 stats 组件 */}
          <div className="stats shadow w-full">
            <div className="stat">
              <div className="stat-figure text-warning">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="stat-title">
                {statusFilter === 'all' ? '待审批' : 
                 statusFilter === 'pending' ? '待审批' :
                 statusFilter === 'approved' ? '已审批' :
                 statusFilter === 'paid' ? '已发放' :
                 statusFilter === 'cancelled' ? '已取消' :
                 statusFilter === 'calculated' ? '已计算' : '当前筛选'}
              </div>
              <div className="stat-value text-warning">
                {statusFilter === 'all' ? allStatsData.pending : currentFilterStats.count}
              </div>
              <div className="stat-desc">
                {statusFilter === 'all' ? '总金额: ' : '当前筛选: '}
                {formatCurrency(statusFilter === 'all' ? allStatsData.pendingAmount : currentFilterStats.amount)}
              </div>
            </div>

            <div className="stat">
              <div className="stat-figure text-success">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="stat-title">已审批</div>
              <div className="stat-value text-success">{stats?.approved || 0}</div>
              <div className="stat-desc">待发放</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-info">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="stat-title">已发放</div>
              <div className="stat-value text-info">{stats?.paid || 0}</div>
              <div className="stat-desc">本月完成</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-error">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="stat-title">已取消</div>
              <div className="stat-value text-error">{stats?.cancelled || 0}</div>
              <div className="stat-desc">无效记录</div>
            </div>
          </div>

          {/* 工具栏 */}
          <div className="border border-base-200 rounded-lg bg-base-100 p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              
              {/* 左侧：选择器组 */}
              <div className="flex items-center gap-3">
                {/* 薪资周期选择器 */}
                <PayrollPeriodSelector
                  selectedMonth={selectedMonth}
                  availableMonths={(availableMonths || []).map(m => ({
                    month: m.month,
                    periodId: m.periodId || '',
                    hasData: m.hasData,
                    payrollCount: m.payrollCount || 0
                  }))}
                  onMonthChange={updateSelectedMonth}
                  isLoading={isLoadingMonths}
                  showCompletenessIndicators={false}
                  size="sm"
                />
                
                {/* 状态选择器 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-base-content/70 whitespace-nowrap">状态：</span>
                  <CompactPayrollStatusSelector
                    value={statusFilter}
                    onChange={setStatusFilter}
                    showIcon={false}
                    className="w-28"
                    placeholder="全部状态"
                  />
                </div>
              </div>

              {/* 中间：搜索框 */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜索员工姓名、部门名称..."
                    className="input input-bordered input-sm w-full pr-20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isLoading}
                  />
                  <div className="absolute right-1 top-1 flex gap-1">
                    {searchQuery && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setSearchQuery('')}
                        title="清除搜索"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary btn-xs"
                      title="搜索"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* 右侧：操作按钮组 */}
              <div className="flex items-center gap-2">
                {/* 审批历史 */}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => modalManager.history.open()}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  审批历史
                </button>
              </div>
            </div>
          </div>


          {/* 批量操作区域 */}
          {selectedIds.length > 0 && (
            <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
              <PayrollBatchActions
                selectedCount={selectedIds.length}
                loading={loading.approve || loading.markPaid || loading.rollback || progressModal.open}
                statusStats={batchValidation.statusStats}
                onClearSelection={() => setSelectedIds([])}
                actions={[
                  {
                    key: 'approve',
                    label: '批量审批',
                    onClick: () => setConfirmModal({ open: true, type: 'approve', loading: false }),
                    variant: 'outline',
                    disabled: !batchValidation.canBatchOperate.approve(),
                    title: batchValidation.canBatchOperate.approve() 
                      ? '批量审批选中记录' 
                      : batchValidation.getOperationReason.approve(),
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )
                  },
                  {
                    key: 'mark-paid',
                    label: '标记已发放',
                    onClick: () => setConfirmModal({ open: true, type: 'paid', loading: false }),
                    variant: 'outline',
                    disabled: !batchValidation.canBatchOperate.markPaid(),
                    title: batchValidation.canBatchOperate.markPaid() 
                      ? '批量标记为已发放' 
                      : batchValidation.getOperationReason.markPaid(),
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )
                  },
                  {
                    key: 'rollback',
                    label: '回滚',
                    onClick: () => setConfirmModal({ open: true, type: 'rollback', loading: false }),
                    variant: 'outline',
                    disabled: !batchValidation.canBatchOperate.rollback(),
                    title: batchValidation.canBatchOperate.rollback() 
                      ? '批量回滚选中记录' 
                      : batchValidation.getOperationReason.rollback(),
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    )
                  }
                ]}
              />
            </div>
          )}

          {/* 表格容器 */}
          <PayrollTableContainer
            data={dataProcessor.processedData}
            columns={columns}
            loading={approvalLoading}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            onViewDetail={modalManager.handlers.handleViewDetail}
            enableRowSelection={true}
          />
        </div>
      }
      modal={
        <>
          <PayrollDetailModal
            payrollId={modalManager.selectedRecordId}
            open={modalManager.detail.isOpen()}
            onClose={modalManager.detail.close}
          />
          
          <ApprovalHistoryModal
            open={modalManager.history.isOpen()}
            onClose={modalManager.history.close}
            initialPeriodId={selectedPeriodId}
            autoRefresh={true}
            refreshInterval={15000}
          />

          {/* 确认模态框 */}
          {confirmModal.type === 'approve' && (
            <BatchConfirmModal
              open={confirmModal.open}
              action="审批"
              selectedCount={selectedIds.length}
              variant="primary"
              loading={confirmModal.loading}
              onConfirm={handleBatchApprove}
              onClose={() => setConfirmModal({ open: false, type: 'approve', loading: false })}
            />
          )}

          {confirmModal.type === 'paid' && (
            <BatchConfirmModal
              open={confirmModal.open}
              action="发放"
              selectedCount={selectedIds.length}
              variant="success"
              loading={confirmModal.loading}
              onConfirm={handleBatchMarkPaid}
              onClose={() => setConfirmModal({ open: false, type: 'approve', loading: false })}
            />
          )}

          {confirmModal.type === 'rollback' && (
            <RollbackConfirmModal
              open={confirmModal.open}
              selectedCount={selectedIds.length}
              onConfirm={handleBatchRollback}
              onClose={() => setConfirmModal({ open: false, type: 'approve', loading: false })}
              loading={confirmModal.loading}
            />
          )}

          {/* 批量审批进度模态框 */}
          <BatchApprovalProgressModal
            isOpen={progressModal.open}
            onClose={() => setProgressModal(prev => ({ ...prev, open: false }))}
            title={
              progressModal.type === 'approve' ? '批量审批进度' :
              progressModal.type === 'markPaid' ? '批量发放进度' :
              progressModal.type === 'rollback' ? '批量回滚进度' :
              '批量操作进度'
            }
            operationType={progressModal.type}
            items={progressModal.items}
            currentItemId={progressModal.currentItemId}
            totalProgress={progressModal.totalProgress}
            allowCancel={progressModal.allowCancel}
            onCancel={() => {
              // 实现取消逻辑
              setProgressModal(prev => ({ ...prev, allowCancel: false }));
            }}
            summary={progressModal.items.length > 0 ? calculateBatchSummary(progressModal.items) : undefined}
          />
        </>
      }
    />
  );
}