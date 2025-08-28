import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  PayrollDetailModal, 
  ApprovalHistoryModal, 
  PayrollBatchActions,
  PayrollTableContainer
} from '@/components/payroll';
import { PayrollApprovalToolbar } from '@/components/payroll/PayrollApprovalToolbar';
import { usePayrollRealtime } from '@/hooks/core/useSupabaseRealtime';
import { usePayrollApproval } from '@/hooks/payroll';
import { usePayrollPeriodSelection } from '@/hooks/payroll/usePayrollPeriodSelection';
import { usePayrollDataProcessor } from '@/hooks/payroll/usePayrollDataProcessor';
import { usePayrollBatchValidation } from '@/hooks/payroll/usePayrollBatchValidation';
import { usePayrollModalManager } from '@/hooks/payroll/usePayrollModalManager';
import { useBatchApprovalManager } from '@/hooks/payroll/useBatchApprovalManager';
import { formatCurrency } from '@/lib/format';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmModal, BatchConfirmModal, RollbackConfirmModal } from '@/components/common/ConfirmModal';
import { BatchApprovalProgressModal, calculateBatchSummary } from '@/components/payroll/BatchApprovalProgressModal';
import type { Database } from '@/types/supabase';
import type { BasePayrollData } from '@/components/payroll/PayrollTableContainer';
import { createDataTableColumnHelper } from '@/components/common/DataTable/utils';
import { PayrollStatusBadge } from '@/components/common/PayrollStatusBadge';
import { OnboardingButton } from '@/components/onboarding';
import { cardEffects } from '@/styles/design-effects';

type PayrollStatus = Database['public']['Enums']['payroll_status'];

// 扩展接口以支持审批页面特定需求
type PayrollApprovalData = BasePayrollData

/**
 * 薪资审批管理页面
 * 展示完整的审批流程管理功能
 */
export default function PayrollApprovalPage() {
  const { t } = useTranslation(['common', 'payroll']);
  const { showSuccess, showError } = useToast();
  
  // 使用模态框管理Hook
  const modalManager = usePayrollModalManager<PayrollApprovalData>();
  
  // 使用批量审批管理Hook
  const batchApprovalManager = useBatchApprovalManager(() => {
    // 刷新数据的回调函数
    // TODO: 添加数据刷新逻辑
  });
  
  // 设置 Realtime 订阅以自动刷新审批数据（临时禁用，待服务器配置修复）
  usePayrollRealtime({
    enabled: false, // 临时禁用，等待服务器配置修复
    showNotifications: false,
    onSuccess: (event, payload) => {
      console.log(`[PayrollApproval] Realtime event: ${event}`, payload);
    },
    onError: (error) => {
      console.error('[PayrollApproval] Realtime error:', error);
    }
  });
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | 'all'>('pending');
  
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


  // 批量操作处理函数 - 使用Hook中的实现
  const handleBatchApprove = useCallback(async () => {
    await batchApprovalManager.handleBatchApprove(selectedIds, dataProcessor.processedData);
    setSelectedIds([]);
  }, [selectedIds, dataProcessor.processedData, batchApprovalManager]);
  
  const handleBatchMarkPaid = useCallback(async () => {
    await batchApprovalManager.handleBatchMarkPaid(selectedIds, dataProcessor.processedData);
    setSelectedIds([]);
  }, [selectedIds, dataProcessor.processedData, batchApprovalManager]);
  
  const handleBatchRollback = useCallback(async (reason: string) => {
    await batchApprovalManager.handleBatchRollback(selectedIds, dataProcessor.processedData, reason);
    setSelectedIds([]);
  }, [selectedIds, dataProcessor.processedData, batchApprovalManager]);

  const isLoading = approvalLoading || statsLoading || isPeriodLoading;

  return (
    <>
      <ManagementPageLayout
      title="薪资审批"
      headerActions={<OnboardingButton />}
      loading={isLoading}
      exportComponent={null}
      customContent={
        <div className="space-y-6">
          {/* 薪资审批统计概览 */}
          <div className="stats shadow w-full" data-tour="approval-workflow">
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
          <PayrollApprovalToolbar
            selectedMonth={selectedMonth}
            availableMonths={(availableMonths || []).map(m => ({
              month: m.month,
              periodId: m.periodId || '',
              hasData: m.hasData,
              hasPeriod: m.hasPeriod,
              payrollCount: m.payrollCount || 0,
              expectedEmployeeCount: m.expectedEmployeeCount,
              status: m.periodStatus,  // 传递真实的周期状态
              isLocked: m.isLocked     // 传递锁定状态
            }))}
            onMonthChange={updateSelectedMonth}
            isLoadingMonths={isLoadingMonths}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            totalLoading={isLoading}
            onHistoryClick={() => modalManager.history.open()}
          />


          {/* 批量操作区域 */}
          {selectedIds.length > 0 && (
            <div className={`${cardEffects.standard} p-4`} data-tour="batch-approval">
              <PayrollBatchActions
                selectedCount={selectedIds.length}
                loading={batchApprovalManager.isLoading}
                statusStats={batchValidation.statusStats}
                onClearSelection={() => setSelectedIds([])}
                actions={[
                  {
                    key: 'approve',
                    label: '批量审批',
                    onClick: () => batchApprovalManager.setConfirmModal({ open: true, type: 'approve', loading: false }),
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
                    onClick: () => batchApprovalManager.setConfirmModal({ open: true, type: 'paid', loading: false }),
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
                    onClick: () => batchApprovalManager.setConfirmModal({ open: true, type: 'rollback', loading: false }),
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
          <div data-tour="approval-list">
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
          {batchApprovalManager.confirmModal.type === 'approve' && (
            <BatchConfirmModal
              open={batchApprovalManager.confirmModal.open}
              action="审批"
              selectedCount={selectedIds.length}
              variant="primary"
              loading={batchApprovalManager.confirmModal.loading}
              onConfirm={handleBatchApprove}
              onClose={() => batchApprovalManager.setConfirmModal({ open: false, type: 'approve', loading: false })}
            />
          )}

          {batchApprovalManager.confirmModal.type === 'paid' && (
            <BatchConfirmModal
              open={batchApprovalManager.confirmModal.open}
              action="发放"
              selectedCount={selectedIds.length}
              variant="success"
              loading={batchApprovalManager.confirmModal.loading}
              onConfirm={handleBatchMarkPaid}
              onClose={() => batchApprovalManager.setConfirmModal({ open: false, type: 'approve', loading: false })}
            />
          )}

          {batchApprovalManager.confirmModal.type === 'rollback' && (
            <RollbackConfirmModal
              open={batchApprovalManager.confirmModal.open}
              selectedCount={selectedIds.length}
              onConfirm={handleBatchRollback}
              onClose={() => batchApprovalManager.setConfirmModal({ open: false, type: 'approve', loading: false })}
              loading={batchApprovalManager.confirmModal.loading}
            />
          )}

          {/* 批量审批进度模态框 */}
          <BatchApprovalProgressModal
            isOpen={batchApprovalManager.progressModal.open}
            onClose={batchApprovalManager.closeProgressModal}
            title={
              batchApprovalManager.progressModal.type === 'approve' ? '批量审批进度' :
              batchApprovalManager.progressModal.type === 'markPaid' ? '批量发放进度' :
              batchApprovalManager.progressModal.type === 'rollback' ? '批量回滚进度' :
              '批量操作进度'
            }
            operationType={batchApprovalManager.progressModal.type}
            items={batchApprovalManager.progressModal.items}
            currentItemId={batchApprovalManager.progressModal.currentItemId}
            totalProgress={batchApprovalManager.progressModal.totalProgress}
            allowCancel={batchApprovalManager.progressModal.allowCancel}
            onCancel={batchApprovalManager.cancelOperation}
            summary={batchApprovalManager.progressModal.items.length > 0 ? calculateBatchSummary(batchApprovalManager.progressModal.items) : undefined}
          />
        </>
      }
      />
    </>
  );
}