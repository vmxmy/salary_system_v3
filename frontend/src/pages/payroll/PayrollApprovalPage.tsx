import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  PayrollApprovalPanel, 
  PayrollDetailModal, 
  ApprovalHistoryModal, 
  PayrollBatchActions,
  PayrollTableContainer,
  PayrollSearchAndFilter,
  PayrollPeriodSelector
} from '@/components/payroll';
import { usePayrollApproval } from '@/hooks/payroll';
import { usePayrollPeriodSelection } from '@/hooks/payroll/usePayrollPeriodSelection';
import { usePayrollDataProcessor } from '@/hooks/payroll/usePayrollDataProcessor';
import { usePayrollBatchValidation } from '@/hooks/payroll/usePayrollBatchValidation';
import { usePayrollModalManager } from '@/hooks/payroll/usePayrollModalManager';
import { formatCurrency } from '@/lib/format';
import { formatMonth } from '@/lib/dateUtils';
import { ManagementPageLayout, type StatCardProps } from '@/components/layout/ManagementPageLayout';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmModal, BatchConfirmModal, RollbackConfirmModal } from '@/components/common/ConfirmModal';
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
  
  const [showFullPanel, setShowFullPanel] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | 'all'>('calculated'); // 默认显示待审批
  
  // 确认模态框状态
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'approve' | 'paid' | 'rollback';
    loading: boolean;
  }>({ open: false, type: 'approve', loading: false });
  
  const { queries, actions, utils } = usePayrollApproval();
  
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
    columnHelper.accessor('payroll_status', {
      header: '状态',
      cell: (info) => (
        <PayrollStatusBadge status={info.getValue() as any} />
      )
    })
  ], [columnHelper]);
  
  // 计算实际的待审批列表（当状态筛选为'all'时仍显示待审批状态）
  const pendingList = statusFilter === 'all' 
    ? rawApprovalList?.filter(item => ['draft', 'calculating', 'calculated'].includes(item.status))
    : rawApprovalList;
  
  const pendingLoading = approvalLoading;

  // 计算待审批总金额
  const pendingAmount = pendingList?.reduce((sum, item) => sum + (item.net_pay || 0), 0) || 0;

  // 准备统计卡片数据
  const statCards: StatCardProps[] = useMemo(() => {
    if (!stats) return [];
    
    return [
      {
        title: '待审批',
        value: `${(stats.draft || 0) + (stats.calculated || 0)}`,
        description: `总金额: ${formatCurrency(pendingAmount)}`,
        icon: '⏳',
        colorClass: 'bg-warning/20'
      },
      {
        title: '已审批',
        value: `${stats.approved || 0}`,
        description: '待发放',
        icon: '✅',
        colorClass: 'bg-success/20'
      },
      {
        title: '已发放',
        value: `${stats.paid || 0}`,
        description: '本月完成',
        icon: '💰',
        colorClass: 'bg-info/20'
      },
      {
        title: '已取消',
        value: `${stats.cancelled || 0}`,
        description: '无效记录',
        icon: '❌',
        colorClass: 'bg-error/20'
      }
    ];
  }, [stats, pendingAmount]);

  // 处理批量审批
  const handleBatchApprove = useCallback(async () => {
    if (selectedIds.length === 0) {
      showError('请选择要审批的记录');
      return;
    }

    try {
      setConfirmModal(prev => ({ ...prev, loading: true }));
      
      await actions.approve(selectedIds);
      showSuccess(`批量审批完成: ${selectedIds.length}/${selectedIds.length}`);
      setSelectedIds([]);
    } catch (error) {
      showError('批量审批失败');
    } finally {
      setConfirmModal(prev => ({ ...prev, loading: false, open: false }));
    }
  }, [selectedIds, utils, showSuccess, showError]);

  // 处理批量标记已发放
  const handleBatchMarkPaid = useCallback(async () => {
    if (selectedIds.length === 0) {
      showError('请选择要标记为已发放的记录');
      return;
    }

    try {
      setConfirmModal(prev => ({ ...prev, loading: true }));
      
      await actions.markPaid(selectedIds);
      showSuccess(`批量发放完成: ${selectedIds.length}/${selectedIds.length}`);
      setSelectedIds([]);
    } catch (error) {
      showError('批量发放失败');
    } finally {
      setConfirmModal(prev => ({ ...prev, loading: false, open: false }));
    }
  }, [selectedIds, utils, showSuccess, showError]);

  // 处理批量回滚
  const handleBatchRollback = useCallback(async (reason: string) => {
    if (selectedIds.length === 0) {
      showError('请选择要回滚的记录');
      return;
    }

    try {
      setConfirmModal(prev => ({ ...prev, loading: true }));
      
      await actions.rollback(selectedIds, reason);
      showSuccess(`批量回滚完成: ${selectedIds.length}/${selectedIds.length}`);
      setSelectedIds([]);
    } catch (error) {
      showError('批量回滚失败');
    } finally {
      setConfirmModal(prev => ({ ...prev, loading: false, open: false }));
    }
  }, [selectedIds, utils, showSuccess, showError]);

  const isLoading = approvalLoading || statsLoading || isPeriodLoading;

  return (
    <ManagementPageLayout
      title="薪资审批"
      loading={isLoading}
      exportComponent={null}
      customContent={
        <div className="space-y-6">
          {/* 统计数据卡片 */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
            <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              审批统计概览
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statCards.map((card, index) => (
                <div key={index} className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-figure">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      card.colorClass || 'bg-info/20'
                    }`}>
                      {typeof card.icon === 'string' ? (
                        <span className="text-lg">{card.icon}</span>
                      ) : (
                        card.icon
                      )}
                    </div>
                  </div>
                  <div className="stat-title text-xs text-base-content/60">{card.title}</div>
                  <div className="stat-value text-lg text-base-content">{card.value}</div>
                  {card.description && (
                    <div className="stat-desc text-xs text-base-content/60">
                      {card.description}
                    </div>
                  )}
                </div>
              ))}
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
                  <select 
                    className="select select-bordered select-sm bg-base-100 w-28"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as PayrollStatus | 'all')}
                  >
                    <option value="all">全部状态</option>
                    <option value="calculated">待审批</option>
                    <option value="approved">已审批</option>
                    <option value="rejected">已拒绝</option>
                    <option value="paid">已发放</option>
                  </select>
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
                {/* 详细面板切换 */}
                <button
                  className={`btn btn-sm ${showFullPanel ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setShowFullPanel(!showFullPanel)}
                  title="切换详细面板显示"
                >
                  {showFullPanel ? '简化视图' : '详细面板'}
                </button>

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

          {/* 审批面板 */}
          {showFullPanel && (
            <PayrollApprovalPanel
              periodId={selectedPeriodId}
              onClose={() => setShowFullPanel(false)}
            />
          )}

          {/* 批量操作区域 */}
          {selectedIds.length > 0 && (
            <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
              <PayrollBatchActions
                selectedCount={selectedIds.length}
                loading={confirmModal.loading}
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
              onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
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
              onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
            />
          )}

          {confirmModal.type === 'rollback' && (
            <RollbackConfirmModal
              open={confirmModal.open}
              selectedCount={selectedIds.length}
              onConfirm={handleBatchRollback}
              onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
              loading={confirmModal.loading}
            />
          )}
        </>
      }
    />
  );
}