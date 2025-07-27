import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { usePayrolls, useCreateBatchPayrolls, useUpdateBatchPayrollStatus, useCalculatePayrolls } from '@/hooks/payroll';
import { usePayrollStatistics } from '@/hooks/payroll/usePayrollStatistics';
import { PayrollList, PayrollBatchActions, PayrollDetailModal } from '@/components/payroll';
import { DataTable } from '@/components/common/DataTable';
import { MonthPicker } from '@/components/common/MonthPicker';
import { FinancialCard } from '@/components/common/FinancialCard';
import { ModernButton } from '@/components/common/ModernButton';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { FieldSelector } from '@/components/common/FieldSelector';
import { PayrollStatusBadge } from '@/components/payroll/PayrollStatusBadge';
import { cn } from '@/lib/utils';
import { PayrollStatus, type PayrollStatusType } from '@/services/payroll.service';
import { useToast } from '@/contexts/ToastContext';
import { getMonthDateRange, getCurrentYearMonth, formatMonth } from '@/lib/dateUtils';
import { formatCurrency, formatDate } from '@/lib/format';
import { exportTableToCSV, exportTableToJSON, exportTableToExcel } from '@/components/common/DataTable/utils';
import { createColumnHelper } from '@tanstack/react-table';
import type { PaginationState } from '@tanstack/react-table';

// 定义薪资数据接口
interface PayrollData {
  id: string;
  employee?: {
    id: string;
    full_name: string;
    id_number: string;
  };
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: PayrollStatusType;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  created_at: string;
  updated_at: string;
}

const columnHelper = createColumnHelper<PayrollData>();

export default function PayrollListPage() {
  const { t } = useTranslation(['common', 'payroll']);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // 状态管理
  const [globalFilter, setGlobalFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<PayrollStatusType | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // 默认为当前月份
    return getCurrentYearMonth();
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  });
  // 模态框状态
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const monthDateRange = getMonthDateRange(selectedMonth);

  // 查询薪资列表
  const { data, isLoading, refetch } = usePayrolls({
    status: statusFilter === 'all' ? undefined : statusFilter,
    startDate: monthDateRange.startDate,
    endDate: monthDateRange.endDate,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize
  });

  // 获取统计数据
  const { data: statistics, isLoading: statsLoading } = usePayrollStatistics(selectedMonth);

  // Mutations
  const createBatchPayrolls = useCreateBatchPayrolls();
  const updateBatchStatus = useUpdateBatchPayrollStatus();
  const calculatePayrolls = useCalculatePayrolls();

  // 数据处理流程 - 集成全局过滤
  const processedData = useMemo(() => {
    let filteredData = data?.data || [];
    
    // 全局搜索
    if (globalFilter.trim()) {
      const query = globalFilter.toLowerCase().trim();
      filteredData = filteredData.filter(payroll => {
        return (
          payroll.employee?.full_name?.toLowerCase().includes(query) ||
          payroll.employee?.id_number?.toLowerCase().includes(query) ||
          payroll.status?.toLowerCase().includes(query) ||
          formatMonth(payroll.pay_period_start.substring(0, 7)).includes(query)
        );
      });
    }
    
    return filteredData;
  }, [data?.data, globalFilter]);

  // 处理行点击 - 使用模态框替代导航
  const handleRowClick = useCallback((payroll: PayrollData) => {
    setSelectedPayrollId(payroll.id);
    setIsDetailModalOpen(true);
  }, []);

  // 关闭模态框
  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedPayrollId(null);
    // 重新获取数据以反映可能的更改
    refetch();
  }, [refetch]);

  // 表格列定义
  const columns = useMemo(() => [
    columnHelper.accessor('employee.full_name', {
      header: t('payroll:employee'),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-base-content">
            {row.original.employee?.full_name || '-'}
          </p>
          <p className="text-xs text-base-content/60">
            {row.original.employee?.id_number || '-'}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor(row => row.pay_period_start.substring(0, 7), {
      id: 'payPeriod',
      header: t('payroll:payPeriod'),
      cell: ({ row }) => {
        const yearMonth = row.original.pay_period_start.substring(0, 7);
        return (
          <div className="text-sm">
            <p className="text-base-content font-medium">
              {formatMonth(yearMonth)}
            </p>
            <p className="text-xs text-base-content/60">
              {t('payDate')}: {formatDate(row.original.pay_date)}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: t('common:common.status'),
      cell: ({ row }) => (
        <PayrollStatusBadge status={row.original.status} size="sm" />
      ),
    }),
    columnHelper.accessor('gross_pay', {
      header: t('payroll:grossPay'),
      cell: ({ row }) => (
        <span className="text-sm font-medium text-success tabular-nums">
          {formatCurrency(row.original.gross_pay)}
        </span>
      ),
    }),
    columnHelper.accessor('total_deductions', {
      header: t('payroll:deductions'),
      cell: ({ row }) => (
        <span className="text-sm font-medium text-error tabular-nums">
          -{formatCurrency(row.original.total_deductions)}
        </span>
      ),
    }),
    columnHelper.accessor('net_pay', {
      header: t('payroll:netPay'),
      cell: ({ row }) => (
        <span className="text-sm font-bold text-primary tabular-nums">
          {formatCurrency(row.original.net_pay)}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: t('common:common.actions'),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPayrollId(row.original.id);
              setIsDetailModalOpen(true);
            }}
            className="btn btn-ghost btn-xs"
            title={t('common:common.view')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      ),
    }),
  ], [t, navigate]);

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
    navigate('/payroll/create-batch');
  }, [navigate]);

  // 处理加载状态
  const totalLoading = isLoading || statsLoading;

  if (totalLoading && !data) {
    return (
      <LoadingScreen 
        message={t('loading')} 
        variant="page" 
        size="lg" 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-50 to-base-100">
      {/* 现代化页面标题区域 */}
      <div className={cn(
        'bg-gradient-to-r from-base-100 via-base-50/50 to-base-100',
        'border-b border-base-200/60 mb-6',
        'shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.04)]'
      )}>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className={cn("text-base", "text-base-content")}>
                  {t('payroll:payrollManagement')}
                </h1>
                <p className={cn("text-base", "text-base-content/60 mt-1")}>
                  {t('payroll:payrollManagementDesc')}
                </p>
              </div>
            </div>
            
            {/* 现代化视图模式切换 */}
            <div className="flex items-center gap-3">
              <span className={cn("text-base", "text-base-content/50 font-medium")}>
                {t('common:viewMode')}:
              </span>
              <div className="flex rounded-lg p-1 bg-base-200/50 border border-base-200/60">
                <ModernButton
                  variant={viewMode === 'table' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="min-w-[90px]"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                  </svg>
                  {t('common:tableView')}
                </ModernButton>
                <ModernButton
                  variant={viewMode === 'cards' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="min-w-[90px]"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {t('common:cards')}
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 space-y-6 pb-12">

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FinancialCard
            title={t('payroll:statistics.totalPayroll')}
            value={formatCurrency(statistics?.totalGrossPay || 0)}
            variant="info"
            icon="💰"
            subtitle={formatMonth(selectedMonth)}
          >
            <div className="mt-3 pt-3 border-t border-base-300">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className={cn("text-base", "text-base-content/60")}>
                    {t('payroll:statistics.averageSalary')}
                  </span>
                  <span className="font-semibold text-success">
                    {formatCurrency(statistics?.averageNetPay || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className={cn("text-base", "text-base-content/60")}>
                    {t('payroll:statistics.employeeCount')}
                  </span>
                  <span className="font-semibold text-primary">
                    {statistics?.employeeCount || 0} {t('common:person')}
                  </span>
                </div>
              </div>
            </div>
          </FinancialCard>
          
          <FinancialCard
            title={t('payroll:statistics.totalDeductions')}
            value={formatCurrency(statistics?.totalDeductions || 0)}
            variant="warning"
            icon="📊"
            subtitle={t('payroll:statistics.includingTaxAndInsurance')}
          >
            <div className="mt-3 pt-3 border-t border-base-300">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className={cn("text-base", "text-base-content/60")}>
                    {t('payroll:statistics.personalTax')}
                  </span>
                  <span className="font-semibold text-error">
                    {formatCurrency(statistics?.totalTax || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className={cn("text-base", "text-base-content/60")}>
                    {t('payroll:statistics.socialInsurance')}
                  </span>
                  <span className="font-semibold text-warning">
                    {formatCurrency(statistics?.totalInsurance || 0)}
                  </span>
                </div>
              </div>
            </div>
          </FinancialCard>
          
          <FinancialCard
            title={t('payroll:statistics.statusDistribution')}
            value={statistics?.statusCount?.total?.toString() || '0'}
            variant="success"
            icon="📈"
            subtitle={t('payroll:statistics.records')}
          >
            <div className="mt-3 pt-3 border-t border-base-300">
              <div className="space-y-2">
                {Object.entries(statistics?.statusCount || {}).filter(([key]) => key !== 'total').map(([status, count]) => {
                  // 确保status是有效的薪资状态
                  const validStatuses = Object.values(PayrollStatus);
                  const isValidStatus = validStatuses.includes(status as PayrollStatusType);
                  
                  return (
                    <div key={status} className="flex justify-between items-center text-xs">
                      <span className={cn("text-base", "text-base-content/60")}>
                        {isValidStatus ? t(`payroll:status.${status}`) : status}
                      </span>
                      <span className="font-semibold">
                        {count as number}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </FinancialCard>
        </div>

        {/* 现代化控制面板 - 搜索、筛选、导出 */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
          <div className="flex items-center justify-between gap-4">
            {/* 现代化搜索框 */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder={t('common:placeholder.search')}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className={cn(
                    'pl-10 pr-4 py-2 w-full text-sm',
                    'bg-gradient-to-r from-base-100 to-base-50/50',
                    'border border-base-200/60 rounded-lg',
                    'focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
                    'transition-all duration-200 placeholder:text-base-content/40'
                  )}
                />
              </div>
            </div>

            {/* 筛选器 */}
            <div className="flex items-center gap-3">
              {/* 月份选择 */}
              <MonthPicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                size="sm"
                placeholder={t('payroll:selectMonth')}
              />

              {/* 状态筛选 */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PayrollStatusType | 'all')}
                className="select select-bordered select-sm"
              >
                <option value="all">{t('common:allStatus')}</option>
                <option value={PayrollStatus.DRAFT}>{t('payroll:status.draft')}</option>
                <option value={PayrollStatus.CALCULATING}>{t('payroll:status.calculating')}</option>
                <option value={PayrollStatus.CALCULATED}>{t('payroll:status.calculated')}</option>
                <option value={PayrollStatus.APPROVED}>{t('payroll:status.approved')}</option>
                <option value={PayrollStatus.PAID}>{t('payroll:status.paid')}</option>
                <option value={PayrollStatus.CANCELLED}>{t('payroll:status.cancelled')}</option>
              </select>
            </div>
            
            {/* 现代化右侧控制按钮 */}
            <div className="flex items-center gap-2">
              {/* 批量操作 */}
              <ModernButton
                onClick={handleCreateBatch}
                variant="primary"
                size="sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">{t('payroll:createBatch')}</span>
              </ModernButton>
              
              {/* 现代化导出按钮 */}
              <div className="dropdown dropdown-end">
                <ModernButton
                  variant="secondary"
                  size="sm"
                  className="tabindex-0"
                  title={t('common:exportAction')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">{t('exportAction')}</span>
                </ModernButton>
                <ul className={cn(
                  'dropdown-content menu p-2 mt-2 w-52 z-50',
                  'bg-gradient-to-br from-base-100 to-base-50/80',
                  'border border-base-200/60 rounded-xl',
                  'shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.1)]',
                  'backdrop-blur-xl'
                )}>
                  <li>
                    <a 
                      onClick={() => exportTableToCSV(processedData, 'payroll')}
                      className="rounded-lg hover:bg-base-200/50 transition-colors duration-200"
                    >
                      CSV
                    </a>
                  </li>
                  <li>
                    <a 
                      onClick={() => exportTableToJSON(processedData, 'payroll')}
                      className="rounded-lg hover:bg-base-200/50 transition-colors duration-200"
                    >
                      JSON
                    </a>
                  </li>
                  <li>
                    <a 
                      onClick={() => exportTableToExcel(processedData, 'payroll')}
                      className="rounded-lg hover:bg-base-200/50 transition-colors duration-200"
                    >
                      Excel
                    </a>
                  </li>
                </ul>
              </div>
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
            onExport={() => exportTableToExcel(processedData.filter(p => selectedIds.includes(p.id)), 'payroll-selected')}
            loading={
              createBatchPayrolls.isPending ||
              updateBatchStatus.isPending ||
              calculatePayrolls.isPending
            }
          />
        )}

        {/* 现代化表格/卡片内容 */}
        <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
          {viewMode === 'table' && (
            <DataTable
              columns={columns}
              data={processedData}
              loading={totalLoading}
              enableRowSelection={true}
              onRowSelectionChange={(rowSelection) => {
                const selectedRows = Object.keys(rowSelection)
                  .filter(key => rowSelection[key])
                  .map(index => processedData[parseInt(index)]?.id)
                  .filter(Boolean);
                setSelectedIds(selectedRows);
              }}
              showToolbar={false}
              showPagination={true}
              showColumnToggle={false}
              showGlobalFilter={false}
              striped={true}
              hover={true}
              className="enhanced-data-table"
              pageCount={data?.totalPages}
              totalRows={data?.total}
              currentPage={pagination.pageIndex + 1}
              onPaginationChange={setPagination}
            />
          )}

          {viewMode === 'cards' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {processedData.map((payroll) => (
                  <div
                    key={payroll.id}
                    className={cn(
                      'card bg-base-100 shadow-sm border border-base-200',
                      'cursor-pointer group transition-all duration-300',
                      'hover:scale-[1.02] hover:shadow-lg',
                      selectedIds.includes(payroll.id) && 'ring-2 ring-primary/30'
                    )}
                    onClick={() => handleRowClick(payroll)}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base text-base-content truncate">
                            {payroll.employee?.full_name || t('common:unknown')}
                          </h3>
                          <p className="text-xs text-base-content/60 truncate">
                            {payroll.employee?.id_number || '-'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-base-content/60 font-medium">{t('payPeriod')}:</span>
                          <span className="font-medium">
                            {formatMonth(payroll.pay_period_start.substring(0, 7))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-base-content/60 font-medium">{t('common:common.status')}:</span>
                          <PayrollStatusBadge status={payroll.status} size="xs" />
                        </div>
                        <div className="pt-2 border-t border-base-200/50 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-base-content/60 font-medium">{t('grossPay')}:</span>
                            <span className="font-mono font-medium text-success">
                              {formatCurrency(payroll.gross_pay)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-base-content/60 font-medium">{t('deductions')}:</span>
                            <span className="font-mono font-medium text-error">
                              -{formatCurrency(payroll.total_deductions)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-base-200/50">
                            <span className="text-base-content/60 font-medium">{t('netPay')}:</span>
                            <span className="font-mono font-bold text-primary">
                              {formatCurrency(payroll.net_pay)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {processedData.length === 0 && !totalLoading && (
                <div className="text-center py-16">
                  <div className="text-base-content/30 mb-4">
                    <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-base-content/50 text-lg font-medium">{t('payroll:noPayrollRecords')}</p>
                  <p className="text-base-content/40 text-sm mt-2">{t('dataTable.noDataDescription')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 薪资详情模态框 */}
      <PayrollDetailModal
        payrollId={selectedPayrollId}
        open={isDetailModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}