import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  usePayrolls, 
  useLatestPayrollPeriod,
  useAvailablePayrollMonths,
  PayrollStatus,
  type PayrollStatusType 
} from '@/hooks/payroll';
import { usePayrollRealtime } from '@/hooks/core/useOptimizedRealtime';
import { usePayrollApproval } from '@/hooks/payroll/usePayrollApproval';
import { useClearPayrollPeriod } from '@/hooks/payroll/useClearPayrollPeriod';
import { type PayrollPeriod } from '@/hooks/payroll/usePayrollPeriod';
import { usePayrollStatistics } from '@/hooks/payroll/usePayrollStatistics';
import { useStableCallback } from '@/hooks/core/useStableCallback';
import { 
  PayrollBatchActions, 
  PayrollTableContainer,
  PayrollSearchAndFilter,
  PayrollPeriodSelector,
  PayrollListToolbar,
  PayrollStatsSection
} from '@/components/payroll';
import { PayrollViewSwitcher, type ViewType } from '@/components/payroll/PayrollViewSwitcher';
import { PayrollDetailContainer } from '@/components/payroll/PayrollDetailContainer';
import { OnboardingButton } from '@/components/onboarding';
import { PayrollModalManager, createBatchModalsConfig } from '@/components/payroll/PayrollModalManager';
import { PayrollBatchReportGenerator } from '@/components/reports/PayrollBatchReportGenerator';
import { PayrollElement, PAYROLL_ELEMENTS_CONFIG } from '@/types/payroll-completeness';
import { usePayrollPeriodCompleteness } from '@/hooks/payroll/usePayrollPeriodCompleteness';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import { cardEffects, inputEffects } from '@/styles/design-effects';
import { useToast } from '@/contexts/ToastContext';
import { getMonthDateRange, getCurrentYearMonth, formatMonth } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { usePermission } from '@/hooks/permissions/usePermission';
import { PERMISSIONS } from '@/constants/permissions';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { exportTableToCSV, exportTableToJSON } from '@/components/common/DataTable/utils';
import type { FieldMetadata } from '@/components/common/FieldSelector';
import { createDataTableColumnHelper } from '@/components/common/DataTable/utils';
import { usePayrollDataProcessor } from '@/hooks/payroll/usePayrollDataProcessor';
import { usePayrollBatchValidation } from '@/hooks/payroll/usePayrollBatchValidation';
import { usePayrollModalManager } from '@/hooks/payroll/usePayrollModalManager';
import { useBatchOperationsManager } from '@/hooks/payroll/useBatchOperationsManager';
import type { PaginationState, Table } from '@tanstack/react-table';
import { PayrollStatusBadge } from '@/components/common/PayrollStatusBadge';

// 使用通用的薪资数据接口
import type { BasePayrollData } from '@/components/payroll/PayrollTableContainer';

// 扩展接口以支持本页面特定需求
interface PayrollData extends BasePayrollData {
  // 本页面特有的其他字段可以在这里添加
}

export default function PayrollListPage() {
  const { t } = useTranslation(['common', 'payroll']);
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();
  const { hasPermission } = usePermission();
  const auth = useUnifiedAuth();

  // 使用通用模态框管理Hook
  const modalManager = usePayrollModalManager<PayrollData>();
  
  // 状态管理
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // 视图切换状态
  const [currentView, setCurrentView] = useState<ViewType>('list');
  
  // 使用稳定的回调避免不必要的重渲染
  const handleSelectedIdsChange = useStableCallback((newIds: string[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 [PayrollListPage] Selection changed:', {
        previousCount: selectedIds.length,
        newCount: newIds.length,
        changed: selectedIds.length !== newIds.length
      });
    }
    setSelectedIds(newIds);
  }, [selectedIds]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // 默认为当前月份，将在useEffect中更新为最近有记录的月份
    return getCurrentYearMonth();
  });
  
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayrollStatusType | 'all'>('all');
  
  // 使用稳定的回调避免不必要的重渲染
  const handleSearchQueryChange = useStableCallback((query: string) => {
    if (process.env.NODE_ENV === 'development' && searchQuery !== query) {
      console.log('🔍 [PayrollListPage] Search query changed:', query.length);
    }
    setSearchQuery(query);
  }, [searchQuery]);
  
  const handleStatusFilterChange = useStableCallback((status: PayrollStatusType | 'all') => {
    if (process.env.NODE_ENV === 'development' && statusFilter !== status) {
      console.log('📊 [PayrollListPage] Status filter changed:', status);
    }
    setStatusFilter(status);
  }, [statusFilter]);
  
  // 视图切换处理
  const handleViewChange = useStableCallback((view: ViewType) => {
    if (process.env.NODE_ENV === 'development' && currentView !== view) {
      console.log('👁️ [PayrollListPage] View changed:', view);
    }
    setCurrentView(view);
    // 切换到详情视图时清空选择，因为详情视图不支持选择
    if (view === 'detail') {
      setSelectedIds([]);
    }
  }, [currentView]);
  
  // 模态框状态管理
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isCompletenessModalOpen, setIsCompletenessModalOpen] = useState(false);
  const [focusedElement, setFocusedElement] = useState<PayrollElement | undefined>();
  const [isMissingEmployeesModalOpen, setIsMissingEmployeesModalOpen] = useState(false);
  const [missingEmployeesElement, setMissingEmployeesElement] = useState<PayrollElement | undefined>();
  const [missingEmployeesData, setMissingEmployeesData] = useState<string[]>([]);
  const [isBatchReportModalOpen, setIsBatchReportModalOpen] = useState(false);
  

  // 从选中的周期获取年月信息
  const [periodYear, setPeriodYear] = useState<number | undefined>();
  const [periodMonth, setPeriodMonth] = useState<number | undefined>();

  // 移除有问题的 useCurrentPayrollPeriod hook
  
  // 获取最近有薪资记录的周期
  const { data: latestPeriod, isLoading: latestPeriodLoading } = useLatestPayrollPeriod();
  
  // 获取可用的薪资月份数据
  const { data: availableMonths } = useAvailablePayrollMonths(true);

  // 自动设置为最近有记录的周期，而不是未来的空周期
  useEffect(() => {
    if (!selectedPeriodId) {
      // 优先使用最近有记录的周期（有实际数据的）
      if (latestPeriod && !latestPeriodLoading) {
        setSelectedPeriodId(latestPeriod.id);
        setPeriodYear(latestPeriod.year);
        setPeriodMonth(latestPeriod.month);
        setSelectedMonth(`${latestPeriod.year}-${latestPeriod.month?.toString().padStart(2, '0')}`);
      }
      // 如果没有任何薪资记录，使用当前月份
      else if (!latestPeriod && !latestPeriodLoading) {
        const currentYearMonth = getCurrentYearMonth();
        setSelectedMonth(currentYearMonth);
      }
    }
  }, [latestPeriod, latestPeriodLoading, selectedPeriodId]);

  // 禁用选择列 —— 交由 PayrollTableContainer 处理
  // 传统的搜索和筛选处理 —— 交由 PayrollSearchAndFilter 处理

  // 查询薪资列表 - 获取指定月份的所有数据
  const { data: rawData, isLoading, refetch } = usePayrolls({
    periodYear,
    periodMonth,
    // 不传递分页参数，获取所有数据
    pageSize: 1000 // 设置一个较大的值来获取所有数据
  });

  // 创建统一的刷新函数，同时刷新薪资列表和统计数据
  const handleRefreshAll = useStableCallback(() => {
    refetch(); // 刷新薪资列表
    // 统计数据会通过 React Query 的缓存失效机制自动刷新
  }, [refetch]);

  // 使用批量操作管理Hook
  const batchOperationsManager = useBatchOperationsManager(handleRefreshAll);
  
  // 使用优化的Realtime订阅
  usePayrollRealtime(true); // 启用优化的Realtime连接池

  // 使用数据处理Hook - 提取实际的数据数组
  const { processedData: allData } = usePayrollDataProcessor<PayrollData>((rawData as any)?.data || []);
  
  // 优化的数据筛选，减少无效的重新计算
  const processedData = useMemo(() => {
    const originalCount = allData?.length || 0;
    let filteredData = [...(allData || [])];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [PayrollListPage] Starting data processing:', originalCount, 'records');
    }
    
    // 状态筛选
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(item => {
        const itemStatus = item.payroll_status || item.status;
        return itemStatus === statusFilter;
      });
    }
    
    // 搜索筛选
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      const query = trimmedQuery.toLowerCase();
      filteredData = filteredData.filter(item => {
        return (
          item.employee_name?.toLowerCase().includes(query) ||
          item.department_name?.toLowerCase().includes(query) ||
          item.position_name?.toLowerCase().includes(query) ||
          item.category_name?.toLowerCase().includes(query) ||
          (item as any).root_category_name?.toLowerCase().includes(query) ||
          item.payroll_status?.toLowerCase().includes(query)
        );
      });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [PayrollListPage] Filtered to', filteredData.length, 'records');
    }
    
    return filteredData;
  }, [allData, statusFilter, searchQuery]);

  // 使用批量验证Hook
  const batchValidation = usePayrollBatchValidation(selectedIds, processedData);

  // 移除自定义筛选函数，使用TanStack Table原生筛选

  // 创建表格列定义 - 使用TanStack Table原生筛选函数
  const columnHelper = createDataTableColumnHelper<PayrollData>();
  const columns = useMemo(() => [
    columnHelper.accessor('employee_name', {
      header: '员工姓名',
      cell: (info) => info.getValue(),
      enableColumnFilter: true,
      filterFn: 'includesString'
    }),
    columnHelper.accessor('root_category_name', {
      header: '根分类',
      cell: (info) => {
        const rootCategory = info.getValue();
        return (
          <div className="flex items-center gap-1">
            <span className={`badge badge-sm ${
              rootCategory === '正编' ? 'badge-success' : 
              rootCategory === '聘用' ? 'badge-info' : 
              'badge-neutral'
            }`}>
              {rootCategory || '-'}
            </span>
          </div>
        );
      },
      enableColumnFilter: true,
      filterFn: 'includesString'
    }),
    columnHelper.accessor('department_name', {
      header: '部门',
      cell: (info) => info.getValue() || '-',
      enableColumnFilter: true,
      filterFn: 'includesString'
    }),
    columnHelper.accessor('position_name', {
      header: '职位',
      cell: (info) => info.getValue() || '-',
      enableColumnFilter: true,
      filterFn: 'includesString'
    }),
    columnHelper.accessor('category_name', {
      header: '人员类别',
      cell: (info) => info.getValue() || '-',
      enableColumnFilter: true,
      filterFn: 'includesString'
    }),
    columnHelper.accessor('gross_pay', {
      header: '应发合计',
      cell: (info) => formatCurrency(info.getValue() || 0),
      enableColumnFilter: true,
      filterFn: 'includesString'
    }),
    columnHelper.accessor('total_deductions', {
      header: '扣发合计',
      cell: (info) => formatCurrency(info.getValue() || 0),
      enableColumnFilter: true,
      filterFn: 'includesString'
    }),
    columnHelper.accessor('net_pay', {
      header: '实发合计',
      cell: (info) => formatCurrency(info.getValue() || 0),
      enableColumnFilter: true,
      filterFn: 'includesString'
    }),
    columnHelper.accessor('payroll_status', {
      header: '状态',
      cell: (info) => (
        <PayrollStatusBadge status={info.getValue() as any} />
      ),
      enableColumnFilter: true,
      filterFn: 'includesString'
    })
  ], [columnHelper]);

  // 获取统计数据
  const { data: statistics, isLoading: statsLoading } = usePayrollStatistics(selectedMonth);
  
  // 获取四要素完整度数据 - 使用实际的 periodId，而不是空字符串
  // 如果 selectedPeriodId 为空，但有 latestPeriod，则使用 latestPeriod.id
  const effectivePeriodId = selectedPeriodId || (latestPeriod?.id);
  const { data: completenessData, isLoading: completenessLoading } = usePayrollPeriodCompleteness(effectivePeriodId || '');
  
  // 检查四要素完整度是否全部达到100%
  const isCompletenessReady = useMemo(() => {
    if (!completenessData) return false;
    return completenessData.earnings_percentage === 100 &&
           completenessData.bases_percentage === 100 &&
           completenessData.category_percentage === 100 &&
           completenessData.job_percentage === 100;
  }, [completenessData]);

  // 检查各种类型的数据
  const totalLoading = isLoading || latestPeriodLoading || statsLoading || completenessLoading;

  const clearPeriod = useClearPayrollPeriod();

  // 专用的选中数据导出处理函数 - 动态从表格列定义生成导出列
  const handleExportSelected = async (selectedData: PayrollData[]) => {
    try {
      console.log('📊 [PayrollListPage] Starting export with selected data:', {
        selectedCount: selectedData.length,
        columnsCount: columns.length,
        dataPreview: selectedData.slice(0, 2).map(item => ({
          id: item.id || item.payroll_id,
          employee_name: item.employee_name,
          root_category_name: (item as any).root_category_name
        }))
      });

      // 动态引入XLSX库
      const XLSX = await import('xlsx');
      
      // 动态从表格列定义生成导出列配置
      const exportColumns = columns.map((col: any) => {
        const columnDef = col.columnDef || col;
        const header = typeof columnDef.header === 'string' ? columnDef.header : col.id;
        const accessorKey = columnDef.accessorKey || col.accessorKey;
        
        // 为不同字段提供特定的格式化函数
        let formatter = (val: any) => val || '-';
        
        if (accessorKey === 'gross_pay' || accessorKey === 'total_deductions' || accessorKey === 'net_pay') {
          formatter = (val: any) => typeof val === 'number' ? val : 0;
        } else if (accessorKey === 'payroll_status') {
          formatter = (val: any) => {
            const statusMap: Record<string, string> = {
              'draft': '草稿',
              'submitted': '已提交', 
              'approved': '已审批',
              'paid': '已发放',
              'cancelled': '已取消'
            };
            return statusMap[val as string] || val || '-';
          };
        } else if (accessorKey === 'root_category_name') {
          formatter = (val: any) => val || '-';
        }
        
        return {
          header,
          key: accessorKey,
          formatter
        };
      }).filter(col => col.key && col.header); // 过滤掉无效的列
      
      console.log('📋 [PayrollListPage] Export columns generated:', {
        exportColumns: exportColumns.map(col => ({ header: col.header, key: col.key }))
      });

      // 转换数据为Excel格式
      const worksheetData = selectedData.map((item, index) => {
        const row: any = { '序号': index + 1 };
        exportColumns.forEach(col => {
          const value = (item as any)[col.key];
          const formattedValue = col.formatter(value);
          row[col.header] = formattedValue;
          
          // 调试日志：检查关键字段的值
          if (col.key === 'root_category_name' && index === 0) {
            console.log('🔍 [Export] Root category debug for first item:', {
              key: col.key,
              rawValue: value,
              formattedValue: formattedValue,
              itemData: {
                employee_name: item.employee_name,
                root_category_name: (item as any).root_category_name,
                category_name: item.category_name
              }
            });
          }
        });
        return row;
      });
      
      console.log('📊 [Export] Worksheet data sample:', {
        totalRows: worksheetData.length,
        sampleRow: worksheetData[0],
        columnHeaders: Object.keys(worksheetData[0] || {})
      });

      // 创建工作簿和工作表
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // 动态设置列宽
      const columnWidths = [
        { wch: 6 }  // 序号
      ];
      
      // 为每个导出列动态设置宽度
      exportColumns.forEach(col => {
        let width = 12; // 默认宽度
        
        // 根据列类型调整宽度
        if (col.key === 'employee_name') width = 12;
        else if (col.key === 'root_category_name') width = 10;
        else if (col.key === 'department_name') width = 15;
        else if (col.key === 'position_name') width = 15;
        else if (col.key === 'category_name') width = 12;
        else if (col.key?.includes('_pay') || col.key?.includes('deductions')) width = 12;
        else if (col.key === 'payroll_status') width = 10;
        
        columnWidths.push({ wch: width });
      });
      worksheet['!cols'] = columnWidths;

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '薪资数据');
      
      // 生成Excel文件并下载
      const fileName = `薪资数据导出_选中${selectedData.length}条_${exportColumns.length}字段_${selectedMonth}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      console.log('✅ [Export] Export completed successfully:', {
        fileName,
        recordCount: selectedData.length,
        fieldCount: exportColumns.length,
        fieldsExported: exportColumns.map(col => col.header)
      });
      
      showSuccess(`已导出${selectedData.length}条记录，包含${exportColumns.length}个字段`);
    } catch (error) {
      console.error('Export selected failed:', error);
      showError(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };



  // 周期变更处理 - 使用稳定回调
  const handleMonthChange = useStableCallback((month: string) => {
    const [year, monthNum] = month.split('-').map(Number);
    
    // 查找对应的薪资周期
    const targetPeriod = availableMonths?.find(period => 
      period.month === month
    );
    
    if (targetPeriod && targetPeriod.periodId) {
      setSelectedPeriodId(targetPeriod.periodId);
      setPeriodYear(year);
      setPeriodMonth(monthNum);
      setSelectedMonth(month);
      setSelectedIds([]); // 清空选择
    } else {
      // 如果没有找到对应的周期，可能需要创建或提示用户
      if (process.env.NODE_ENV === 'development') {
        console.warn(`No period found for ${month}`);
      }
      setSelectedMonth(month);
      setPeriodYear(year);
      setPeriodMonth(monthNum);
      setSelectedPeriodId('');
      setSelectedIds([]);
    }
  }, [availableMonths]);

  // 清空当月数据处理 - 使用稳定回调
  const handleClearCurrentMonth = useStableCallback(async (onProgress?: (step: string, completed: number, total: number) => void) => {
    if (!selectedPeriodId) {
      showError('请先选择有效的薪资周期');
      return;
    }

    try {
      await clearPeriod.mutateAsync({ 
        periodId: selectedPeriodId,
        periodName: formatMonth(selectedMonth),
        onProgress
      });
      refetch(); // 刷新数据
      setSelectedIds([]); // 清空选择
      setIsClearModalOpen(false);
    } catch (error) {
      console.error('Clear period error:', error);
      showError('清空失败');
    }
  }, [selectedPeriodId, selectedMonth, clearPeriod, showError, refetch]);



  return (
    <>
      <ManagementPageLayout
        title="薪资管理"
        headerActions={
          <div className="flex items-center gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsBatchReportModalOpen(true)}
              disabled={!selectedPeriodId}
              title={selectedPeriodId ? '批量生成薪资报表' : '请先选择薪资周期'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              生成报表
            </button>
            <OnboardingButton />
          </div>
        }
        loading={totalLoading}
        exportComponent={null}
        customContent={
          <div className="space-y-6">
            {/* 统计数据区域 */}
            <PayrollStatsSection
              statistics={statistics}
              completenessData={completenessData}
              statsLoading={statsLoading}
              completenessLoading={completenessLoading}
              onElementClick={(element) => {
                setFocusedElement(element);
                setIsCompletenessModalOpen(true);
              }}
            />

          {/* 工具栏 */}
          <PayrollListToolbar
            selectedMonth={selectedMonth}
            availableMonths={(availableMonths || []).map(m => ({
              month: m.month,
              periodId: m.periodId || '',
              hasData: m.hasData,
              hasPeriod: m.hasPeriod,
              payrollCount: m.payrollCount || 0,
              expectedEmployeeCount: m.expectedEmployeeCount || 0,
              status: m.periodStatus,  // 传递真实的状态数据
              isLocked: m.isLocked     // 传递锁定状态
            }))}
            onMonthChange={handleMonthChange}
            isLoading={latestPeriodLoading}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            searchQuery={searchQuery}
            onSearchQueryChange={handleSearchQueryChange}
            totalLoading={totalLoading}
            exportData={processedData}
            onClearClick={() => setIsClearModalOpen(true)}
          />

          {/* 重算功能提示 */}
          {!isCompletenessReady && selectedIds.length > 0 && (
            <div className="alert alert-warning">
              <svg className="w-6 h-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <div className="font-bold">重算功能暂不可用</div>
                <div className="text-sm">四要素完整度需要达到100%才能执行重算操作</div>
              </div>
              <button 
                className="btn btn-sm btn-outline" 
                onClick={() => {
                  setFocusedElement(undefined);
                  setIsCompletenessModalOpen(true);
                }}
              >
                查看四要素详情
              </button>
            </div>
          )}

          {/* 批量操作区域 - 仅在列表视图且有选中项时显示 */}
          {currentView === 'list' && selectedIds.length > 0 && (
            <div className={`${cardEffects.standard} p-4`} data-tour="batch-payroll-operations">
              <PayrollBatchActions
                selectedCount={selectedIds.length}
                loading={batchOperationsManager.isAnyOperationLoading}
                onClearSelection={() => setSelectedIds([])}
                actions={[
                  {
                    key: 'calculate-insurance',
                    label: '重算五险一金',
                    onClick: () => batchOperationsManager.handleBatchCalculateInsurance(
                      selectedIds, 
                      processedData, 
                      selectedPeriodId || '', 
                      isCompletenessReady
                    ),
                    variant: 'outline',
                    disabled: !batchValidation.canBatchOperate.calculateInsurance() || !isCompletenessReady,
                    title: !isCompletenessReady 
                      ? '四要素完整度未达到100%，无法执行重算操作'
                      : batchValidation.canBatchOperate.calculateInsurance() 
                        ? '批量重算五险一金' 
                        : batchValidation.getOperationReason.calculateInsurance(),
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16z" />
                      </svg>
                    )
                  },
                  {
                    key: 'calculate-payroll',
                    label: '重算薪资汇总',
                    onClick: () => batchOperationsManager.handleBatchCalculatePayroll(
                      selectedIds, 
                      processedData, 
                      isCompletenessReady
                    ),
                    variant: 'outline',
                    disabled: !batchValidation.canBatchOperate.calculatePayroll() || !isCompletenessReady,
                    title: !isCompletenessReady 
                      ? '四要素完整度未达到100%，无法执行重算操作'
                      : batchValidation.canBatchOperate.calculatePayroll() 
                        ? '批量重算薪资汇总' 
                        : batchValidation.getOperationReason.calculatePayroll(),
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                      </svg>
                    )
                  },
                  {
                    key: 'submit',
                    label: '提交审批',
                    onClick: () => batchOperationsManager.setConfirmModal({ open: true, type: 'submit', loading: false }),
                    variant: 'info',
                    disabled: !batchValidation.canBatchOperate.submit(),
                    title: batchValidation.canBatchOperate.submit() 
                      ? '批量提交审批' 
                      : batchValidation.getOperationReason.submit(),
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )
                  },
                  {
                    key: 'export',
                    label: '导出选中',
                    onClick: () => {
                      const selectedData = processedData.filter(p => selectedIds.includes(p.id || p.payroll_id || ''));
                      handleExportSelected(selectedData);
                    },
                    variant: 'outline',
                    title: '导出选中的薪资记录',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )
                  },
                  {
                    key: 'delete',
                    label: '批量删除',
                    onClick: () => batchOperationsManager.handleBatchDelete(selectedIds, processedData),
                    variant: 'error',
                    disabled: !batchValidation.canBatchOperate.delete(),
                    title: batchValidation.canBatchOperate.delete() 
                      ? '批量删除选中的薪资记录（包括相关的四要素数据）' 
                      : batchValidation.getOperationReason.delete(),
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )
                  }
                ]}
              />
            </div>
          )}

          {/* 表格工具栏：视图切换器 */}
          <div className={`${cardEffects.standard} p-4 mb-4`}>
            <div className="flex justify-end">
              <PayrollViewSwitcher
                currentView={currentView}
                onViewChange={handleViewChange}
                className="shrink-0"
              />
            </div>
          </div>

          {/* 内容区域 - 根据视图类型显示不同内容 */}
          <div data-tour="payroll-content">
            {currentView === 'list' ? (
              // 列表视图：显示薪资汇总表格
              <div>
                {process.env.NODE_ENV === 'development' && (() => {
                  console.log('🎯 [PayrollListPage] Rendering list view:', {
                    dataCount: processedData.length,
                    selectedCount: selectedIds.length,
                    isLoading
                  });
                  return null;
                })()}
                
                <PayrollTableContainer
                  data={processedData}
                  columns={columns}
                  loading={isLoading}
                  selectedIds={selectedIds}
                  onSelectedIdsChange={handleSelectedIdsChange}
                  onViewDetail={modalManager.handlers.handleViewDetail}
                  enableRowSelection={true}
                  showColumnToggle={false}
                />
              </div>
            ) : (
              // 详情视图：显示薪资明细
              <div>
                {process.env.NODE_ENV === 'development' && (() => {
                  console.log('🎯 [PayrollListPage] Rendering detail view:', {
                    dataCount: processedData.length,
                    isLoading
                  });
                  return null;
                })()}
                <PayrollDetailContainer
                  data={processedData}
                  loading={isLoading}
                />
              </div>
            )}
          </div>
        </div>
      }
      modal={
        <PayrollModalManager
          // 详情模态框配置
          detailModal={{
            isOpen: modalManager.detail.isOpen(),
            payrollId: modalManager.selectedRecordId || undefined,
            onClose: modalManager.detail.close
          }}
          
          // 清空确认模态框配置
          clearModal={{
            isOpen: isClearModalOpen,
            title: formatMonth(selectedMonth),
            message: '确认清空当月数据？',
            periodId: selectedPeriodId,
            onConfirm: handleClearCurrentMonth,
            onCancel: () => setIsClearModalOpen(false)
          }}
          
          // 批量操作模态框配置（使用适配器函数）
          batchModals={{
            ...createBatchModalsConfig(batchOperationsManager, selectedIds.length),
            submitConfirm: {
              ...createBatchModalsConfig(batchOperationsManager, selectedIds.length).submitConfirm,
              onConfirm: () => batchOperationsManager.handleBatchSubmit(selectedIds, allData || [])
            }
          }}
          
          // 完整度模态框配置
          completenessModal={{
            isOpen: isCompletenessModalOpen,
            completeness: completenessData || null,
            focusedElement: focusedElement,
            onClose: () => {
              setIsCompletenessModalOpen(false);
              setFocusedElement(undefined);
            },
            onElementClick: (element) => {
              setFocusedElement(element);
            },
            onViewMissingEmployees: async (element) => {
              try {
                setMissingEmployeesElement(element);
                
                // TODO: 实现根据要素类型获取缺失员工姓名的逻辑
                // 这里需要调用API获取具体的缺失员工数据
                const mockMissingEmployees = [
                  '张三', '李四', '王五', '赵六', '钱七'
                ]; // 临时模拟数据
                
                setMissingEmployeesData(mockMissingEmployees);
                setIsMissingEmployeesModalOpen(true);
              } catch (error) {
                console.error('Failed to fetch missing employees:', error);
                showError('获取缺失员工数据失败');
              }
            }
          }}
          
          // 缺失员工模态框配置
          missingEmployeesModal={{
            isOpen: isMissingEmployeesModalOpen,
            element: missingEmployeesElement,
            employeeNames: missingEmployeesData,
            onClose: () => {
              setIsMissingEmployeesModalOpen(false);
              setMissingEmployeesElement(undefined);
              setMissingEmployeesData([]);
            }
          }}
        />
      }
      />

      {/* 批量报表生成模态框 */}
      {isBatchReportModalOpen && selectedPeriodId && (
        <PayrollBatchReportGenerator
          periodId={selectedPeriodId}
          periodName={formatMonth(selectedMonth)}
          currentFilters={{
            searchQuery,
            statusFilter: statusFilter === 'all' ? undefined : statusFilter,
            // 这里可以添加其他筛选条件
          }}
          isModal={true}
          onClose={() => setIsBatchReportModalOpen(false)}
        />
      )}
    </>
  );
}