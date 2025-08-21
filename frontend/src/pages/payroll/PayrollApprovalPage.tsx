import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { PayrollApprovalPanel, PayrollDetailModal, ApprovalHistoryModal, PayrollBatchActions } from '@/components/payroll';
import { usePayrollApproval } from '@/hooks/payroll';
import { usePayrollPeriodSelection } from '@/hooks/payroll/usePayrollPeriodSelection';
import { formatCurrency } from '@/lib/format';
import { formatMonth } from '@/lib/dateUtils';
import { MonthPicker } from '@/components/common/MonthPicker';
import { ModernButton } from '@/components/common/ModernButton';
import { ManagementPageLayout, type StatCardProps } from '@/components/layout/ManagementPageLayout';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmModal, BatchConfirmModal, RollbackConfirmModal } from '@/components/common/ConfirmModal';
import type { PayrollApprovalSummary } from '@/hooks/payroll/usePayrollApproval';
import type { Database } from '@/types/supabase';

type PayrollStatus = Database['public']['Enums']['payroll_status'];

/**
 * 薪资审批管理页面
 * 展示完整的审批流程管理功能
 */
export default function PayrollApprovalPage() {
  const { t } = useTranslation(['common', 'payroll']);
  const { showSuccess, showError } = useToast();
  
  const [showFullPanel, setShowFullPanel] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | 'all'>('all');
  
  // 确认模态框状态
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'approve' | 'paid' | 'rollback';
    loading: boolean;
  }>({ open: false, type: 'approve', loading: false });
  
  const { queries, utils } = usePayrollApproval();
  
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
  const { data: approvalList, isLoading: approvalLoading } = queries.useApprovalSummary(approvalFilters);
  
  // 计算实际的待审批列表（当状态筛选为'all'时仍显示待审批状态）
  const pendingList = statusFilter === 'all' 
    ? approvalList?.filter(item => ['draft', 'calculating', 'calculated'].includes(item.status))
    : approvalList;
  
  const pendingLoading = approvalLoading;

  // 计算待审批总金额
  const pendingAmount = pendingList?.reduce((sum, item) => sum + (item.net_pay || 0), 0) || 0;

  // 搜索处理函数
  const handleSearch = useCallback(() => {
    setActiveSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchReset = useCallback(() => {
    setSearchQuery('');
    setActiveSearchQuery('');
  }, []);

  // 处理行选择变化 - 使用ref避免依赖processedData
  const processedDataRef = useRef<any[]>([]);
  
  const handleRowSelectionChange = useCallback((rowSelection: any) => {
    // 使用 setTimeout 延迟状态更新，避免在渲染过程中更新状态
    setTimeout(() => {
      const selectedRows = Object.keys(rowSelection)
        .filter(key => rowSelection[key])
        .map(index => {
          const rowIndex = parseInt(index);
          const row = processedDataRef.current[rowIndex];
          return row?.id || row?.payroll_id;
        })
        .filter(Boolean);
      setSelectedIds(selectedRows);
    }, 0);
  }, []); // 空依赖数组，使用ref访问最新数据

  // 准备统计卡片数据
  const statCards: StatCardProps[] = useMemo(() => {
    if (!stats) return [];
    
    return [
      {
        title: '待审批',
        value: `${(stats.draft || 0) + (stats.calculated || 0)}`,
        description: `总金额: ${formatCurrency(pendingAmount)}`,
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        colorClass: 'text-warning'
      },
      {
        title: '已审批',
        value: `${stats.approved || 0}`,
        description: '待发放',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        colorClass: 'text-success'
      },
      {
        title: '已发放',
        value: `${stats.paid || 0}`,
        description: '本月完成',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        colorClass: 'text-info'
      },
      {
        title: '已取消',
        value: `${stats.cancelled || 0}`,
        description: '无效记录',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        colorClass: 'text-error'
      }
    ];
  }, [stats, pendingAmount]);

  // 处理查看详情
  const handleViewDetail = useCallback((payrollId: string) => {
    setSelectedPayrollId(payrollId);
    setShowDetailModal(true);
  }, []);

  // 关闭详情模态框
  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedPayrollId(null);
  }, []);

  // 定义操作列配置
  const actionsConfig = useMemo(() => ({
    id: 'actions', // 添加id字段
    accessorKey: 'actions', // 添加accessorKey
    header: '操作', // 使用header而不是title
    size: 120, // 使用size而不是width
    enableSorting: false, // 禁用排序
    cell: ({ row }: { row: any }) => (
      <div className="flex gap-1">
        <button
          className="btn btn-ghost btn-xs text-primary"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetail(row.original.payroll_id);
          }}
          title="查看详情"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>
    )
  }), [handleViewDetail]);

  // 基础表格列配置 - 不包含选择列
  const baseColumns = useMemo(() => [
    {
      id: 'employee_name',
      accessorKey: 'employee_name',
      header: '员工姓名',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => any }) => (
        <span className="font-medium text-base-content">{getValue()}</span>
      )
    },
    {
      id: 'pay_date',
      accessorKey: 'pay_date', 
      header: '支付日期',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        return value ? new Date(value).toLocaleDateString() : '-';
      }
    },
    {
      id: 'gross_pay',
      accessorKey: 'gross_pay',
      header: '应发工资',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => any }) => (
        <span className="font-mono text-success font-medium">
          {formatCurrency(getValue() || 0)}
        </span>
      ),
      meta: {
        align: 'right'
      }
    },
    {
      id: 'total_deductions',
      accessorKey: 'total_deductions',
      header: '扣除合计', 
      size: 100,
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => any }) => (
        <span className="font-mono text-warning">
          {formatCurrency(getValue() || 0)}
        </span>
      ),
      meta: {
        align: 'right'
      }
    },
    {
      id: 'net_pay',
      accessorKey: 'net_pay',
      header: '实发工资',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => any }) => (
        <span className="font-mono text-info font-medium">
          {formatCurrency(getValue() || 0)}
        </span>
      ),
      meta: {
        align: 'right'
      }
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: '状态',
      size: 90,
      enableSorting: true,
      cell: ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        return (
          <span className={`badge badge-${utils.getStatusColor(value as PayrollStatus)} badge-sm`}>
            {utils.getStatusLabel(value as PayrollStatus)}
          </span>
        );
      }
    },
    {
      id: 'last_action_at',
      accessorKey: 'last_action_at',
      header: '最后操作',
      size: 120,
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        const record = row.original;
        return record.last_action_at && record.last_operator ? (
          <div className="text-xs">
            <div className="font-medium">{record.last_operator}</div>
            <div className="text-base-content/60">
              {new Date(record.last_action_at).toLocaleDateString()}
            </div>
          </div>
        ) : (
          <span className="text-base-content/40">-</span>
        );
      }
    },
    actionsConfig
  ], [actionsConfig, utils]);

  // 处理数据，包含搜索过滤逻辑
  const processedData = useMemo(() => {
    if (!pendingList) return [];
    
    // 先转换数据格式
    let processedItems = pendingList.map(item => ({
      ...item,
      id: item.payroll_id, // 确保有id字段用于选择
      key: item.payroll_id // 为表格提供key
    }));
    
    // 应用搜索过滤 - 使用activeSearchQuery
    if (activeSearchQuery.trim()) {
      const query = activeSearchQuery.toLowerCase().trim();
      processedItems = processedItems.filter(payroll => {
        // 搜索所有可能的字段
        const searchableFields = [
          payroll.employee_name,        // 员工姓名
          payroll.status,               // 状态
          payroll.pay_date,             // 支付日期
          payroll.gross_pay?.toString(), // 应发工资
          payroll.net_pay?.toString(),   // 实发工资
          payroll.last_operator,        // 最后操作人
        ].filter(Boolean); // 过滤掉空值
        
        // 检查是否任一字段包含搜索关键词
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(query)
        );
      });
    }
    
    // 更新ref以供行选择使用
    processedDataRef.current = processedItems;
    
    return processedItems;
  }, [pendingList, activeSearchQuery]);

  // 完整的表格列配置 - 包含选择列
  const columns = useMemo(() => [
    // 选择列
    {
      id: 'select',
      header: ({ table }: any) => {
        const isAllSelected = processedData.length > 0 && selectedIds.length === processedData.length;
        const isIndeterminate = selectedIds.length > 0 && selectedIds.length < processedData.length;
        
        return (
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isIndeterminate;
            }}
            onChange={(e) => {
              if (e.target.checked) {
                // 全选：选择所有数据
                const allIds = processedData.map(item => item.id || item.payroll_id).filter(Boolean);
                setSelectedIds(allIds);
              } else {
                // 取消全选
                setSelectedIds([]);
              }
            }}
            title={isAllSelected ? "取消全选" : "全选所有数据"}
          />
        );
      },
      cell: ({ row }: any) => {
        const rowId = row.original.id || row.original.payroll_id;
        return (
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={selectedIds.includes(rowId)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedIds(prev => [...prev, rowId]);
              } else {
                setSelectedIds(prev => prev.filter(id => id !== rowId));
              }
            }}
            title="选择此行"
          />
        );
      },
      size: 50,
      enableSorting: false,
      enableColumnFilter: false,
    },
    ...baseColumns
  ], [processedData, selectedIds, baseColumns]);

  // 处理查看审批历史
  const handleViewHistory = () => {
    setShowHistoryModal(true);
  };

  // 关闭审批历史模态框
  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
  };

  // 批量审批处理函数
  const handleBatchApprove = useCallback(() => {
    if (selectedIds.length === 0) {
      showError('请选择需要审批的记录');
      return;
    }
    setConfirmModal({ open: true, type: 'approve', loading: false });
  }, [selectedIds, showError]);

  // 执行批量审批
  const executeBatchApprove = useCallback(async () => {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await utils.batchUpdateStatus(selectedIds, 'approved');
      
      if (result.success) {
        showSuccess(`成功审批 ${selectedIds.length} 条记录`);
        setSelectedIds([]);
        setConfirmModal({ open: false, type: 'approve', loading: false });
        window.location.reload();
      } else {
        showError(result.message || '批量审批失败');
        setConfirmModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量审批失败';
      showError(errorMessage);
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  }, [selectedIds, utils, showSuccess, showError]);

  // 批量标记为已支付处理函数
  const handleBatchMarkAsPaid = useCallback(() => {
    if (selectedIds.length === 0) {
      showError('请选择需要标记的记录');
      return;
    }
    setConfirmModal({ open: true, type: 'paid', loading: false });
  }, [selectedIds, showError]);

  // 执行批量标记为已支付
  const executeBatchMarkAsPaid = useCallback(async () => {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await utils.batchUpdateStatus(selectedIds, 'paid');
      
      if (result.success) {
        showSuccess(`成功标记 ${selectedIds.length} 条记录为已支付`);
        setSelectedIds([]);
        setConfirmModal({ open: false, type: 'paid', loading: false });
        window.location.reload();
      } else {
        showError(result.message || '批量标记失败');
        setConfirmModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量标记失败';
      showError(errorMessage);
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  }, [selectedIds, utils, showSuccess, showError]);

  // 批量回滚处理函数
  const handleBatchRollback = useCallback(() => {
    if (selectedIds.length === 0) {
      showError('请选择需要回滚的记录');
      return;
    }

    // 获取选中记录的状态信息
    const selectedRecords = processedDataRef.current.filter(record => 
      selectedIds.includes(record.id || record.payroll_id)
    );
    
    // 检查是否有可回滚的记录
    const rollbackableRecords = selectedRecords.filter(record => 
      ['approved', 'paid'].includes(record.status)
    );
    
    if (rollbackableRecords.length === 0) {
      showError('选中的记录中没有可回滚的状态（只能回滚已审批或已支付的记录）');
      return;
    }

    setConfirmModal({ open: true, type: 'rollback', loading: false });
  }, [selectedIds, showError]);

  // 执行批量回滚
  const executeBatchRollback = useCallback(async (reason: string) => {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    
    try {
      const selectedRecords = processedDataRef.current.filter(record => 
        selectedIds.includes(record.id || record.payroll_id)
      );
      
      const rollbackableRecords = selectedRecords.filter(record => 
        ['approved', 'paid'].includes(record.status)
      );

      const rollbackIds = rollbackableRecords.map(r => r.id || r.payroll_id);
      const result = await utils.batchRollbackStatus(rollbackIds, {
        reason: reason,
        operator: 'current_user'
      });
      
      if (result.success) {
        showSuccess(`成功回滚 ${rollbackableRecords.length} 条记录的审批状态`);
        setSelectedIds([]);
        setConfirmModal({ open: false, type: 'rollback', loading: false });
        window.location.reload();
      } else {
        showError(result.message || '批量回滚失败');
        setConfirmModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量回滚失败';
      showError(errorMessage);
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  }, [selectedIds, utils, showSuccess, showError]);

  // 计算加载状态 - 包含数据初始化状态
  const totalLoading = statsLoading || pendingLoading || isPeriodLoading;

  // 计算选中记录的状态验证结果
  const selectedRecordsValidation = useMemo(() => {
    if (selectedIds.length === 0) {
      return {
        approve: { canOperate: false, reason: '未选择任何记录' },
        markPaid: { canOperate: false, reason: '未选择任何记录' },
        rollback: { canOperate: false, reason: '未选择任何记录' }
      };
    }

    // 获取选中记录的状态
    const selectedRecords = processedDataRef.current.filter(record => 
      selectedIds.includes(record.id || record.payroll_id)
    );
    const selectedStatuses = selectedRecords.map(record => record.status as PayrollStatus);

    return {
      approve: utils.batchCanApprove(selectedStatuses),
      markPaid: utils.batchCanMarkPaid(selectedStatuses),
      rollback: utils.batchCanRollback(selectedStatuses)
    };
  }, [selectedIds, utils]);

  // 薪资周期选择器区域 - 统一使用PayrollListPage的卡片结构（移除card-body层级）
  const periodSelectorContent = useMemo(() => (
    <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 薪资周期筛选 */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium text-base-content">薪资周期：</span>
          </div>
          <MonthPicker
            value={selectedMonth}
            onChange={updateSelectedMonth}
            showDataIndicators={true}
            availableMonths={availableMonths}
            onlyShowMonthsWithData={true}
            placeholder="选择薪资周期"
            className="flex-shrink-0 w-36"
            size="sm"
            showCompletenessIndicators={false}
            disabled={isPeriodLoading}
          />

          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
            <span className="text-xs font-medium text-base-content">状态：</span>
          </div>
          <select 
            className="select select-bordered select-xs bg-base-100 w-28 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PayrollStatus | 'all')}
          >
            <option value="all">全部状态</option>
            <option value="draft">草稿</option>
            <option value="calculating">计算中</option>
            <option value="calculated">已计算</option>
            <option value="approved">已审批</option>
            <option value="paid">已发放</option>
            <option value="cancelled">已取消</option>
          </select>

          {isPeriodLoading && (
            <div className="flex items-center gap-1 text-xs text-base-content/60">
              <div className="loading loading-spinner loading-xs"></div>
              <span>加载中...</span>
            </div>
          )}
          {pendingList && pendingList.length > 0 && hasValidSelection && (
            <div className="flex items-center gap-1 text-xs text-base-content/70 ml-auto">
              <span>共</span>
              <span className="font-medium text-primary">{pendingList.length}</span>
              <span>条记录</span>
            </div>
          )}
        </div>
    </div>
  ), [selectedMonth, availableMonths, pendingList, statusFilter, hasValidSelection, isPeriodLoading, utils]);

  return (
    <ManagementPageLayout
      title="薪资审批管理"
      subtitle="管理薪资审批流程，查看审批历史记录"
      statCards={statCards}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      onSearch={handleSearch}
      onSearchReset={handleSearchReset}
      searchPlaceholder="搜索员工姓名、审批状态..."
      searchLoading={totalLoading}
      showFieldSelector={false}
      primaryActions={[
        <ModernButton
          key="approval-panel"
          onClick={() => setShowFullPanel(true)}
          variant="primary"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          打开审批面板
        </ModernButton>,
        <ModernButton
          key="approval-history"
          onClick={handleViewHistory}
          variant="secondary"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          审批历史
        </ModernButton>
      ]}
      customContent={
        <div className="space-y-4">
          {/* 薪资周期筛选控制 - 已统一卡片结构（移除card-body层级，直接使用p-4） */}
          {periodSelectorContent}
          
          {/* 批量操作快速操作卡片 - 使用统一的PayrollBatchActions组件 */}
          <PayrollBatchActions
            selectedCount={selectedIds.length}
            loading={totalLoading}
            onClearSelection={() => setSelectedIds([])}
            actions={[
              {
                key: 'batch-approve',
                label: '批量审批',
                onClick: handleBatchApprove,
                variant: 'outline',
                disabled: !selectedRecordsValidation.approve.canOperate,
                title: selectedRecordsValidation.approve.canOperate 
                  ? '审批选中的记录' 
                  : selectedRecordsValidation.approve.reason,
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              },
              {
                key: 'batch-paid',
                label: '标记已支付',
                onClick: handleBatchMarkAsPaid,
                variant: 'outline',
                disabled: !selectedRecordsValidation.markPaid.canOperate,
                title: selectedRecordsValidation.markPaid.canOperate 
                  ? '标记选中记录为已支付' 
                  : selectedRecordsValidation.markPaid.reason,
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )
              },
              {
                key: 'batch-rollback',
                label: '批量回滚',
                onClick: handleBatchRollback,
                variant: 'outline',
                disabled: !selectedRecordsValidation.rollback.canOperate,
                title: selectedRecordsValidation.rollback.canOperate 
                  ? '撤销已审批或已支付记录的状态' 
                  : selectedRecordsValidation.rollback.reason,
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
      }
      data={processedData}
      columns={columns}
      loading={totalLoading}
      initialSorting={[{ id: 'pay_date', desc: true }]}
      initialPagination={{ pageIndex: 0, pageSize: 20 }}
      enableRowSelection={true}
      onRowSelectionChange={handleRowSelectionChange}
      enableExport={false}
      showGlobalFilter={false}
      showColumnToggle={false}
      modal={
        <>
          {/* 审批面板模态框 */}
          {showFullPanel && (
            <dialog className="modal modal-open">
              <div className="modal-box max-w-6xl">
                <PayrollApprovalPanel 
                  periodId={selectedPeriodId}
                  onClose={() => setShowFullPanel(false)}
                />
              </div>
              <form method="dialog" className="modal-backdrop">
                <button onClick={() => setShowFullPanel(false)}>close</button>
              </form>
            </dialog>
          )}

          {/* 薪资详情模态框 */}
          <PayrollDetailModal
            payrollId={selectedPayrollId}
            open={showDetailModal}
            onClose={handleCloseDetailModal}
          />

          {/* 审批历史模态框 */}
          <ApprovalHistoryModal
            initialPeriodId={selectedPeriodId}
            open={showHistoryModal}
            onClose={handleCloseHistoryModal}
          />

          {/* 确认模态框 */}
          {confirmModal.type === 'approve' && (
            <BatchConfirmModal
              open={confirmModal.open}
              onClose={() => setConfirmModal({ open: false, type: 'approve', loading: false })}
              onConfirm={executeBatchApprove}
              action="审批"
              selectedCount={selectedIds.length}
              details="审批后状态将变更为'已审批'，可通过回滚功能撤销此操作。"
              loading={confirmModal.loading}
              variant="success"
            />
          )}

          {confirmModal.type === 'paid' && (
            <BatchConfirmModal
              open={confirmModal.open}
              onClose={() => setConfirmModal({ open: false, type: 'paid', loading: false })}
              onConfirm={executeBatchMarkAsPaid}
              action="标记为已支付"
              selectedCount={selectedIds.length}
              details="标记后状态将变更为'已支付'。"
              loading={confirmModal.loading}
              variant="primary"
            />
          )}

          {confirmModal.type === 'rollback' && (
            <RollbackConfirmModal
              open={confirmModal.open}
              onClose={() => setConfirmModal({ open: false, type: 'rollback', loading: false })}
              onConfirm={executeBatchRollback}
              selectedCount={selectedIds.length}
              loading={confirmModal.loading}
            />
          )}
        </>
      }
    />
  );
}