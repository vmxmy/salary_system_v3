import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { usePayrolls, useLatestPayrollPeriod } from '@/hooks/payroll';
import { usePayrollStatistics } from '@/hooks/payroll/usePayrollStatistics';
import { useClearPayrollPeriod } from '@/hooks/payroll/useClearPayrollPeriod';
import { useTableConfiguration } from '@/hooks/core';
import { PayrollBatchActions, PayrollDetailModal } from '@/components/payroll';
import { ClearPayrollModal } from '@/components/payroll/ClearPayrollModal';
import { DataTable } from '@/components/common/DataTable';
import { MonthPicker } from '@/components/common/MonthPicker';
import { ModernButton } from '@/components/common/ModernButton';
import { PayrollStatus, type PayrollStatusType } from '@/hooks/payroll';
import { useToast } from '@/contexts/ToastContext';
import { getMonthDateRange, getCurrentYearMonth, formatMonth } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/format';
import { usePayrollCreation } from '@/hooks/payroll/usePayrollCreation';
import { usePermission } from '@/hooks/core';
import { PERMISSIONS } from '@/constants/permissions';
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
  employee_name: string;
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

interface PayrollReportsProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  periodId?: string; // Add periodId to support clearing functionality
}

export function PayrollReports({ selectedMonth, onMonthChange, periodId }: PayrollReportsProps) {
  const { t } = useTranslation(['common', 'payroll']);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { hasPermission } = usePermission();

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
    key: 'actions',
    title: '操作',
    width: 100,
    render: (row: any) => (
      <button 
        className="btn btn-sm btn-ghost"
        onClick={() => {
          const payrollId = row.payroll_id || row.id;
          if (payrollId) {
            setSelectedPayrollId(payrollId);
            setIsDetailModalOpen(true);
          }
        }}
      >
        查看详情
      </button>
    )
  });

  // 状态管理
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState(''); // 实际用于搜索的查询
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<PayrollStatusType | 'all'>('all');
  const [tableInstance, setTableInstance] = useState<Table<any> | null>(null);
  
  // 模态框状态
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const monthDateRange = getMonthDateRange(selectedMonth);

  // 获取最近有薪资记录的月份
  const { data: latestMonth, isLoading: latestMonthLoading } = useLatestPayrollPeriod();

  // 自动设置为最近有记录的月份
  useEffect(() => {
    if (latestMonth && !latestMonthLoading) {
      onMonthChange(latestMonth.period_name || `${latestMonth.year}-${latestMonth.month?.toString().padStart(2, '0')}`);
    }
  }, [latestMonth, latestMonthLoading, onMonthChange]);

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
    periodId: monthDateRange.startDate,
    // 不传递分页参数，获取所有数据
    pageSize: 1000 // 设置一个较大的值来获取所有数据
  });

  // 获取统计数据
  const { data: statistics, isLoading: statsLoading } = usePayrollStatistics(selectedMonth);
  
  // 清空薪资数据
  const clearPeriod = useClearPayrollPeriod();

  // Mutations
  // Removed updateBatchStatus - approval actions moved to PayrollApprovalPage

  // 数据处理流程 - 前端过滤和搜索
  const processedData = useMemo(() => {
    const rawData = data?.data || [];
    
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
          payroll.employee_name,           // 员工姓名
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

  // 批量操作处理 - 审批功能已移除，只保留导出功能

  // 创建新的薪资批次 - 功能已移除
  // const handleCreateBatch = useCallback(() => {
  //   navigate('/payroll/create-cycle');
  // }, [navigate]);

  // 清空本月数据
  const handleClearCurrentMonth = useCallback(async (onProgress?: (step: string, completed: number, total: number) => void) => {
    if (!periodId) {
      showError('请先选择有效的薪资周期');
      return;
    }

    try {
      await clearPeriod.mutateAsync({ 
        periodId, 
        periodName: formatMonth(selectedMonth),
        onProgress
      });
      refetch();
      setIsClearModalOpen(false);
    } catch (error) {
      console.error('Clear period error:', error);
      // Error is already handled by the hook's onError
    }
  }, [periodId, selectedMonth, clearPeriod, refetch]);

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
    <div className="space-y-4">
      {/* 筛选控制 */}
      <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* 月份选择 */}
            <MonthPicker
              value={selectedMonth}
              onChange={onMonthChange}
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
          
          {/* 操作按钮组 */}
          <div className="flex items-center gap-2">
            {/* 创建批次按钮 - 功能已移除 */}
            {/* <ModernButton
              onClick={handleCreateBatch}
              variant="primary"
              size="sm"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              {t('payroll:createBatch')}
            </ModernButton> */}
            
            {/* 清空本月按钮 */}
            {hasPermission(PERMISSIONS.PAYROLL_CLEAR) && (
              <ModernButton
                onClick={() => setIsClearModalOpen(true)}
                variant="danger"
                size="sm"
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
            )}
            
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

        {/* 搜索控制和字段配置器 */}
        <div className="flex items-center justify-between gap-4 mt-4">
          {/* 搜索区域 */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索员工姓名、部门名称、状态..."
                className="input input-bordered input-sm w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <ModernButton
              onClick={handleSearch}
              variant="primary"
              size="sm"
              loading={totalLoading}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            >
              搜索
            </ModernButton>
            <ModernButton
              onClick={handleSearchReset}
              variant="secondary"
              size="sm"
            >
              重置
            </ModernButton>
          </div>

          {/* 字段配置器 */}
          {metadata?.defaultFields && metadata.defaultFields.length > 0 && (
            <div className="dropdown dropdown-end">
              <ModernButton
                variant="secondary"
                size="sm"
                title="配置显示字段"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                字段配置
              </ModernButton>
              <div className="dropdown-content menu p-4 mt-2 w-80 z-50 bg-base-100 border border-base-200 rounded-xl shadow-lg max-h-96 overflow-y-auto">
                <h4 className="font-medium text-base-content mb-3">显示字段配置</h4>
                <div className="space-y-2">
                  {metadata.defaultFields.map((field: string) => {
                    const columnConfig = userConfig?.visibleColumns.includes(field);
                    const isVisible = columnConfig;
                    
                    return (
                      <label key={field} className="flex items-center gap-2 cursor-pointer hover:bg-base-200 p-2 rounded">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={isVisible}
                          onChange={(e) => {
                            const currentVisible = userConfig?.visibleColumns || metadata.defaultFields;
                            const newVisible = e.target.checked 
                              ? [...currentVisible.filter(f => f !== field), field]
                              : currentVisible.filter(f => f !== field);
                            updateUserConfig({ 
                              ...userConfig, 
                              visibleColumns: newVisible,
                              columnOrder: userConfig?.columnOrder || metadata.defaultFields,
                              columnWidths: userConfig?.columnWidths || {}
                            });
                          }}
                        />
                        <span className="text-sm">{(metadata.fieldLabels as any)?.[field] || field}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="divider my-2"></div>
                <ModernButton
                  onClick={resetToDefault}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  重置为默认
                </ModernButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedIds.length > 0 && (
        <PayrollBatchActions
          selectedCount={selectedIds.length}
          onExport={() => exportTableToExcel(processedData.filter(p => selectedIds.includes(p.id || p.payroll_id)), 'payroll-selected')}
          loading={false}
        />
      )}

      {/* 数据表格 */}
      <DataTable
        data={processedData}
        columns={columns}
        loading={totalLoading}
        onTableReady={setTableInstance}
        initialSorting={[{ id: 'pay_date', desc: true }]}
        initialPagination={{ pageIndex: 0, pageSize: 20 }}
        enableRowSelection={true}
        onRowSelectionChange={handleRowSelectionChange}
        showColumnToggle={true}
      />

      {/* 模态框 */}
      <PayrollDetailModal
        payrollId={selectedPayrollId}
        open={isDetailModalOpen}
        onClose={handleCloseModal}
      />
      <ClearPayrollModal
        isOpen={isClearModalOpen}
        month={formatMonth(selectedMonth)}
        periodId={periodId}
        onConfirm={handleClearCurrentMonth}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
}