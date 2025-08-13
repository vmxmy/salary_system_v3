import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { usePayrolls, useUpdateBatchPayrollStatus, useCalculatePayrolls, useLatestPayrollMonth } from '@/hooks/payroll';
import { usePayrollStatistics } from '@/hooks/payroll/usePayrollStatistics';
import { useTableConfiguration } from '@/hooks/useTableConfiguration';
import { PayrollBatchActions, PayrollDetailModal } from '@/components/payroll';
import { ClearPayrollModal } from '@/components/payroll/ClearPayrollModal';
import { ManagementPageLayout, type StatCardProps } from '@/components/layout/ManagementPageLayout';
import { MonthPicker } from '@/components/common/MonthPicker';
import { ModernButton } from '@/components/common/ModernButton';
import { PayrollStatus, type PayrollStatusType } from '@/services/payroll.service';
import { useToast } from '@/contexts/ToastContext';
import { getMonthDateRange, getCurrentYearMonth, formatMonth } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/format';
import { PayrollCreationService } from '@/services/payroll-creation.service';
import { usePermission } from '@/hooks/usePermission';
import { exportTableToCSV, exportTableToJSON, exportTableToExcel } from '@/components/common/DataTable/utils';
import type { PaginationState, Table } from '@tanstack/react-table';

// 定义薪资数据接口 - 匹配 view_payroll_summary 结构
interface PayrollData {
  payroll_id: string;
  id?: string; // 兼容字段
  pay_date: string;
  pay_period_start: string;
  pay_period_end: string;
  employee_id: string;
  employee_name: string; // 使用数据库字段名
  department_name: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: PayrollStatusType;
  // 兼容旧结构
  employee?: {
    id: string;
    employee_name: string;
    id_number?: string;
  };
}

export default function PayrollListPage() {
  const { t } = useTranslation(['common', 'payroll']);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { can } = usePermission();

  // 表格配置管理
  const {
    metadata,
    metadataLoading,
    metadataError,
    userConfig,
    columns,
    updateUserConfig,
    resetToDefault,
  } = useTableConfiguration('payroll', {
    onViewDetail: (row) => {
      const payrollId = row.payroll_id || row.id;
      if (payrollId) {
        setSelectedPayrollId(payrollId);
        setIsDetailModalOpen(true);
      }
    },
  });

  // 状态管理
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState(''); // 实际用于搜索的查询
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<PayrollStatusType | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // 默认为当前月份，将在useEffect中更新为最近有记录的月份
    return getCurrentYearMonth();
  });
  const [tableInstance, setTableInstance] = useState<Table<any> | null>(null);
  
  // 模态框状态
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const monthDateRange = getMonthDateRange(selectedMonth);

  // 获取最近有薪资记录的月份
  const { data: latestMonth, isLoading: latestMonthLoading } = useLatestPayrollMonth();

  // 自动设置为最近有记录的月份
  useEffect(() => {
    if (latestMonth && !latestMonthLoading) {
      setSelectedMonth(latestMonth);
    }
  }, [latestMonth, latestMonthLoading]);

  // 搜索处理函数 - 手动触发搜索
  const handleSearch = useCallback(() => {
    setActiveSearchQuery(searchQuery);
    // TanStack Table 会自动重置分页到第一页
    if (tableInstance) {
      tableInstance.setPageIndex(0);
    }
  }, [searchQuery, tableInstance]);

  const handleSearchReset = useCallback(() => {
    setSearchQuery('');
    setActiveSearchQuery('');
    // TanStack Table 会自动重置分页到第一页
    if (tableInstance) {
      tableInstance.setPageIndex(0);
    }
  }, [tableInstance]);

  // 查询薪资列表 - 获取指定月份的所有数据
  const { data, isLoading, refetch } = usePayrolls({
    startDate: monthDateRange.startDate,
    endDate: monthDateRange.endDate,
    // 不传递分页参数，获取所有数据
    pageSize: 1000 // 设置一个较大的值来获取所有数据
  });

  // 获取统计数据
  const { data: statistics, isLoading: statsLoading } = usePayrollStatistics(selectedMonth);

  // Mutations
  const updateBatchStatus = useUpdateBatchPayrollStatus();
  const calculatePayrolls = useCalculatePayrolls();

  // 数据处理流程 - 前端过滤和搜索
  const processedData = useMemo(() => {
    let rawData = data?.data || [];
    
    // 先转换数据格式
    let processedItems = rawData.map(item => ({
      ...item,
      id: item.id || item.payroll_id, // 确保有id字段用于选择
      // 确保employee字段存在（用于兼容旧代码）
      employee: item.employee || {
        id: item.employee_id,
        employee_name: item.employee_name,
        id_number: null
      }
    }));
    
    // 状态过滤
    if (statusFilter !== 'all') {
      processedItems = processedItems.filter(item => item.status === statusFilter);
    }
    
    // 全局模糊搜索 - 使用手动触发的搜索查询
    if (activeSearchQuery.trim()) {
      const query = activeSearchQuery.toLowerCase().trim();
      processedItems = processedItems.filter(payroll => {
        // 搜索所有可能的字段
        const searchableFields = [
          payroll.employee_name,        // 员工姓名
          payroll.department_name,     // 部门名称
          payroll.status,               // 状态
          payroll.pay_date,             // 支付日期
          payroll.gross_pay?.toString(), // 应发工资
          payroll.net_pay?.toString(),   // 实发工资
        ].filter(Boolean); // 过滤掉空值
        
        // 检查是否任一字段包含搜索关键词
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(query)
        );
      });
    }
    
    return processedItems;
  }, [data?.data, statusFilter, activeSearchQuery]);

  // 处理行点击 - 使用模态框替代导航
  const handleRowClick = useCallback((payroll: PayrollData) => {
    const payrollId = payroll.id || payroll.payroll_id;
    if (payrollId) {
      setSelectedPayrollId(payrollId);
      setIsDetailModalOpen(true);
    }
  }, []);

  // 关闭模态框
  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedPayrollId(null);
    // 重新获取数据以反映可能的更改
    refetch();
  }, [refetch]);

  // 处理行选择变化 - 稳定的回调，通过ref访问最新数据
  const processedDataRef = useRef(processedData);
  processedDataRef.current = processedData;
  
  const handleRowSelectionChange = useCallback((rowSelection: any) => {
    const selectedRows = Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => {
        const rowIndex = parseInt(index);
        const row = processedDataRef.current[rowIndex];
        return row?.id || row?.payroll_id;
      })
      .filter(Boolean);
    setSelectedIds(selectedRows);
  }, []); // 空依赖数组，使用ref访问最新数据

  // 批量操作处理
  const handleBatchCalculate = useCallback(async () => {
    try {
      await calculatePayrolls.mutateAsync(selectedIds);
      showSuccess(t('calculateSuccess'));
      setSelectedIds([]);
      refetch();
    } catch (error) {
      showError(t('calculateError'));
    }
  }, [selectedIds, calculatePayrolls, t, refetch]);

  const handleBatchApprove = useCallback(async () => {
    try {
      await updateBatchStatus.mutateAsync({
        payrollIds: selectedIds,
        status: PayrollStatus.APPROVED
      });
      showSuccess(t('approveSuccess'));
      setSelectedIds([]);
      refetch();
    } catch (error) {
      showError(t('approveError'));
    }
  }, [selectedIds, updateBatchStatus, t, refetch]);

  const handleBatchMarkPaid = useCallback(async () => {
    try {
      await updateBatchStatus.mutateAsync({
        payrollIds: selectedIds,
        status: PayrollStatus.PAID
      });
      showSuccess(t('markPaidSuccess'));
      setSelectedIds([]);
      refetch();
    } catch (error) {
      showError(t('markPaidError'));
    }
  }, [selectedIds, updateBatchStatus, t, refetch]);

  // 创建新的薪资批次
  const handleCreateBatch = useCallback(() => {
    navigate('/payroll/create-cycle');
  }, [navigate]);

  // 清空本月数据
  const handleClearCurrentMonth = useCallback(async () => {
    try {
      // 调用清空薪资数据服务
      const monthDateRange = getMonthDateRange(selectedMonth);
      const result = await PayrollCreationService.clearPayrollDataByPeriod(
        monthDateRange.startDate,
        monthDateRange.endDate,
        'CLEAR_PAYROLL_CONFIRMED'
      );

      if (result.success) {
        if (result.deleted_summary) {
          const summary = result.deleted_summary;
          showSuccess(
            `${formatMonth(selectedMonth)} 的薪资数据已清空\n` +
            `删除薪资记录: ${summary.deleted_payrolls} 条\n` +
            `删除薪资项目: ${summary.deleted_items} 条\n` +
            `涉及员工: ${summary.affected_employees} 人`
          );
        } else {
          showSuccess(`${formatMonth(selectedMonth)} 的薪资数据已清空`);
        }
        refetch();
      } else {
        showError(`清空数据失败: ${result.error_message || '未知错误'}`);
      }
    } catch (error) {
      showError(`清空数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsClearModalOpen(false);
    }
  }, [selectedMonth, showSuccess, showError, refetch]);

  // 准备统计卡片数据
  const statCards: StatCardProps[] = useMemo(() => {
    if (!statistics) return [];

    return [
      {
        title: t('payroll:statistics.totalPayroll'),
        value: formatCurrency(statistics.totalGrossPay || 0),
        description: formatMonth(selectedMonth),
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        colorClass: 'text-info'
      },
      {
        title: t('payroll:statistics.totalDeductions'),
        value: formatCurrency(statistics.totalDeductions || 0),
        description: t('payroll:statistics.includingTaxAndInsurance'),
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        colorClass: 'text-warning'
      },
      {
        title: t('payroll:netPay'),
        value: formatCurrency(statistics.totalNetPay || 0),
        description: `${statistics.employeeCount || 0} ${t('common:person')}`,
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        colorClass: 'text-success'
      }
    ];
  }, [statistics, selectedMonth, t]);

  // 处理加载状态
  const totalLoading = isLoading || statsLoading || latestMonthLoading || metadataLoading;

  // 错误处理
  if (metadataError) {
    return <div className="alert alert-error">表格配置加载错误: {metadataError}</div>;
  }

  if (!metadata || !userConfig) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-3">正在加载表格配置...</span>
      </div>
    );
  }

  return (
    <ManagementPageLayout
      title={t('payroll:payrollManagement')}
      subtitle={t('payroll:payrollManagementDesc')}
      statCards={statCards}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      onSearch={handleSearch}
      onSearchReset={handleSearchReset}
      searchPlaceholder="搜索员工姓名、部门名称、状态..."
      searchLoading={totalLoading}
      showFieldSelector={true}
      fields={metadata?.fields || []}
      userConfig={userConfig}
      onFieldConfigChange={updateUserConfig}
      onFieldConfigReset={resetToDefault}
      primaryActions={[
        <ModernButton
          key="create-cycle"
          onClick={handleCreateBatch}
          variant="primary"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          {t('payroll:createBatch')}
        </ModernButton>,
        
        ...(can('PAYROLL_CLEAR') ? [
          <ModernButton
            key="clear-month"
            onClick={() => setIsClearModalOpen(true)}
            variant="danger"
            size="md"
            title="清空本月薪资数据（需要薪资清除权限）"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            清空本月
          </ModernButton>
        ] : [])
      ]}
      data={processedData}
      columns={columns}
      loading={totalLoading}
      tableInstance={tableInstance || undefined}
      onTableReady={setTableInstance}
      initialSorting={[{ id: 'pay_date', desc: true }]}
      initialPagination={{ pageIndex: 0, pageSize: 20 }}
      enableExport={false}
      showGlobalFilter={false}
      showColumnToggle={false}
      enableRowSelection={true}
      onRowSelectionChange={handleRowSelectionChange}
      customContent={
        <div className="space-y-4">
          {/* 筛选控制 */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* 月份选择 */}
                <MonthPicker
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  size="sm"
                  placeholder={String(t('payroll:selectMonth'))}
                  showDataIndicators={true}
                />

                {/* 状态筛选 */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PayrollStatusType | 'all')}
                  className="select select-bordered select-sm"
                >
                  <option value="all">{t('common:allStatus')}</option>
                  <option value={PayrollStatus.DRAFT}>{t('payroll:status.draft')}</option>
                  <option value={PayrollStatus.APPROVED}>{t('payroll:status.approved')}</option>
                  <option value={PayrollStatus.PAID}>{t('payroll:status.paid')}</option>
                  <option value={PayrollStatus.CANCELLED}>{t('payroll:status.cancelled')}</option>
                </select>
              </div>
              
              {/* 导出按钮 */}
              <div className="dropdown dropdown-end">
                <ModernButton
                  variant="secondary"
                  size="sm"
                  className="tabindex-0"
                  title={t('common:exportAction')}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  导出
                </ModernButton>
                <ul className="dropdown-content menu p-2 mt-2 w-52 z-50 bg-base-100 border border-base-200 rounded-xl shadow-lg">
                  <li>
                    <a onClick={() => exportTableToCSV(processedData, 'payroll')} className="rounded-lg">
                      CSV
                    </a>
                  </li>
                  <li>
                    <a onClick={() => exportTableToJSON(processedData, 'payroll')} className="rounded-lg">
                      JSON
                    </a>
                  </li>
                  <li>
                    <a onClick={() => exportTableToExcel(processedData, 'payroll')} className="rounded-lg">
                      Excel
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 批量操作栏 */}
          {selectedIds.length > 0 && (
            <PayrollBatchActions
              selectedCount={selectedIds.length}
              onCalculate={handleBatchCalculate}
              onApprove={handleBatchApprove}
              onMarkPaid={handleBatchMarkPaid}
              onExport={() => exportTableToExcel(processedData.filter(p => selectedIds.includes(p.id || p.payroll_id)), 'payroll-selected')}
              loading={
                updateBatchStatus.isPending ||
                calculatePayrolls.isPending
              }
            />
          )}
        </div>
      }
      modal={
        <>
          <PayrollDetailModal
            payrollId={selectedPayrollId}
            open={isDetailModalOpen}
            onClose={handleCloseModal}
          />
          <ClearPayrollModal
            isOpen={isClearModalOpen}
            month={formatMonth(selectedMonth)}
            onConfirm={handleClearCurrentMonth}
            onCancel={() => setIsClearModalOpen(false)}
          />
        </>
      }
    />
  );
}