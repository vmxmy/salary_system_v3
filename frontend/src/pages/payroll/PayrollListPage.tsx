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
import { usePayrollApproval } from '@/hooks/payroll/usePayrollApproval';
import { useClearPayrollPeriod } from '@/hooks/payroll/useClearPayrollPeriod';
import { type PayrollPeriod } from '@/hooks/payroll/usePayrollPeriod';
import { usePayrollStatistics } from '@/hooks/payroll/usePayrollStatistics';
import { useBatchInsuranceCalculation } from '@/hooks/insurance';
import { usePayrollCalculation } from '@/hooks/payroll/usePayrollCalculation';
import { PayrollBatchActions, PayrollDetailModal, CalculationProgressModal, INSURANCE_CALCULATION_STEPS, PAYROLL_CALCULATION_STEPS, COMBINED_CALCULATION_STEPS } from '@/components/payroll';
import { ClearPayrollModal } from '@/components/payroll/ClearPayrollModal';
import { PayrollCompletenessModal } from '@/components/payroll/PayrollCompletenessModal';
import { PayrollCompletenessStats } from '@/components/payroll/PayrollCompletenessStats';
import { usePayrollPeriodCompleteness } from '@/hooks/payroll/usePayrollPeriodCompleteness';
import { ConfirmModal, BatchConfirmModal } from '@/components/common/ConfirmModal';
import { DataTable } from '@/components/common/DataTable';
import { MonthPicker } from '@/components/common/MonthPicker';
import { ModernButton } from '@/components/common/ModernButton';
import { ManagementPageLayout, type StatCardProps } from '@/components/layout/ManagementPageLayout';
import { useToast } from '@/contexts/ToastContext';
import { getMonthDateRange, getCurrentYearMonth, formatMonth } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { usePermission, PERMISSIONS } from '@/hooks/core';
import { exportTableToCSV, exportTableToJSON, exportTableToExcel } from '@/components/common/DataTable/utils';
import type { FieldMetadata } from '@/components/common/FieldSelector';
import { usePayrollTableColumns } from '@/hooks/payroll/usePayrollTableColumns';
import type { PaginationState, Table } from '@tanstack/react-table';
import { PayrollStatusBadge } from '@/components/common/PayrollStatusBadge';

// 定义薪资数据接口 - 匹配 view_payroll_summary 结构
interface PayrollData {
  payroll_id: string;
  id?: string; // 兼容字段
  pay_date: string;  // 从 actual_pay_date 或 scheduled_pay_date 映射
  actual_pay_date?: string;  // 实际发薪日期
  scheduled_pay_date?: string;  // 计划发薪日期
  pay_period_start: string;
  pay_period_end: string;
  employee_id: string;
  employee_name: string; // 使用数据库字段名
  department_name?: string;
  position_name?: string;
  category_name?: string; // 新增身份类别字段
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  payroll_status: PayrollStatusType;
  status?: PayrollStatusType; // 兼容字段
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
  const { showSuccess, showError, showInfo } = useToast();
  const { hasPermission } = usePermission();

  // 处理查看详情
  const handleViewDetail = useCallback((row: PayrollData) => {
    const payrollId = row.payroll_id || row.id;
    if (payrollId) {
      setSelectedPayrollId(payrollId);
      setIsDetailModalOpen(true);
    }
  }, []);


  // 定义操作列配置
  const actionsConfig = useMemo(() => ({
    key: 'actions',
    title: '操作',
    width: 120,
    render: (record: PayrollData) => (
      <div className="flex gap-1">
        <button
          className="btn btn-ghost btn-xs text-primary"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetail(record);
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

  // 使用动态列配置Hook
  const { 
    allColumnConfigs, 
    generateFieldMetadata, 
    getDefaultColumnVisibility,
    getCoreColumns,
    getOptionalColumns 
  } = usePayrollTableColumns();

  // TanStack Table列可见性状态
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    return getDefaultColumnVisibility();
  });

  // 从配置生成基础表格列 - 不包含选择列
  const baseColumns = useMemo(() => {
    const dataColumns = allColumnConfigs.map(config => {
      let cellRenderer = config.cell ? ({ getValue }: any) => config.cell!(getValue) : undefined;
      
      // 如果是状态字段且启用了徽章样式，使用徽章组件
      if (config.useBadge && config.type === 'status') {
        cellRenderer = ({ getValue }: any) => {
          const status = getValue() as PayrollStatusType;
          return <PayrollStatusBadge status={status} size="sm" />;
        };
      }
      
      return {
        id: config.id,
        accessorKey: config.accessorKey,
        header: config.header,
        size: config.size,
        cell: cellRenderer,
        enableSorting: config.enableSorting ?? true,
        enableColumnFilter: config.enableColumnFilter ?? true,
      };
    });

    // 添加操作列
    dataColumns.push({
      id: 'actions',
      accessorKey: '', // 操作列不需要数据
      header: '操作',
      size: 120,
      cell: ({ row }: any) => actionsConfig.render(row.original),
      enableSorting: false,
      enableColumnFilter: false,
    });

    return dataColumns;
  }, [allColumnConfigs, actionsConfig]);

  // 状态管理
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState(''); // 实际用于搜索的查询
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<PayrollStatusType | 'all'>('all');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // 默认为当前月份，将在useEffect中更新为最近有记录的月份
    return getCurrentYearMonth();
  });
  const [tableInstance, setTableInstance] = useState<Table<any> | null>(null);
  
  // 模态框状态
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isCompletenessModalOpen, setIsCompletenessModalOpen] = useState(false);
  
  // 计算进度模态框状态
  const [isCalculationProgressOpen, setIsCalculationProgressOpen] = useState(false);
  const [calculationTitle, setCalculationTitle] = useState('');
  const [calculationSteps, setCalculationSteps] = useState<any[]>([]);
  const [currentCalculationStep, setCurrentCalculationStep] = useState<string>('');
  const [calculationProgress, setCalculationProgress] = useState(0);

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
    periodYear,
    periodMonth,
    // 不传递分页参数，获取所有数据
    pageSize: 1000 // 设置一个较大的值来获取所有数据
  });

  // 获取统计数据
  const { data: statistics, isLoading: statsLoading } = usePayrollStatistics(selectedMonth);
  
  // 获取四要素完整度数据
  const { data: completenessData, isLoading: completenessLoading } = usePayrollPeriodCompleteness(selectedPeriodId);
  
  // 检查四要素完整度是否全部达到100%
  const isCompletenessReady = useMemo(() => {
    if (!completenessData) return false;
    
    return (
      completenessData.earnings_percentage === 100 &&
      completenessData.bases_percentage === 100 &&
      completenessData.category_percentage === 100 &&
      completenessData.job_percentage === 100
    );
  }, [completenessData]);

  // Mutations - removed updateBatchStatus since approval actions moved to PayrollApprovalPage
  
  // 计算相关hooks
  const { calculateBatchInsurance, loading: batchInsuranceLoading, progress: insuranceProgress } = useBatchInsuranceCalculation();
  const payrollCalculation = usePayrollCalculation();
  
  // 审批验证相关hooks - 用于按钮约束逻辑
  const { utils: approvalUtils } = usePayrollApproval();

  // 数据处理流程 - 前端过滤和搜索
  const processedData = useMemo(() => {
    let rawData = data?.data || [];
    
    // 先转换数据格式
    let processedItems = rawData.map((item: any) => ({
      ...item,
      id: item.id || item.payroll_id, // 确保有id字段用于选择
      // 确保payroll_status字段存在（从原始数据中获取）
      payroll_status: item.payroll_status,
      // 确保employee字段存在（用于兼容旧代码）
      employee: item.employee || {
        id: item.employee_id,
        employee_name: item.employee_name,
        id_number: null
      }
    } as PayrollData));
    
    // 状态过滤
    if (statusFilter !== 'all') {
      processedItems = processedItems.filter(item => item.payroll_status === statusFilter);
    }
    
    // 全局模糊搜索 - 使用手动触发的搜索查询
    if (activeSearchQuery.trim()) {
      const query = activeSearchQuery.toLowerCase().trim();
      processedItems = processedItems.filter(payroll => {
        // 搜索所有可能的字段
        const searchableFields = [
          payroll.employee_name,        // 员工姓名
          payroll.department_name,      // 部门名称
          (payroll as any).position_name,        // 职位名称
          (payroll as any).category_name,        // 身份类别
          payroll.payroll_status,       // 状态
          payroll.actual_pay_date || payroll.scheduled_pay_date || payroll.pay_date,  // 支付日期
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

  // 使用Hook中的generateFieldMetadata
  const getFieldMetadata = useCallback((table?: Table<any>): FieldMetadata[] => {
    if (!table) {
      // 没有table实例时，从配置生成
      return generateFieldMetadata(columnVisibility);
    }

    // 从table实例获取运行时可见性状态
    const runtimeVisibility: Record<string, boolean> = {};
    table.getAllColumns().forEach(col => {
      if (col.id !== 'select' && col.id !== 'actions') {
        runtimeVisibility[col.id] = col.getIsVisible();
      }
    });

    return generateFieldMetadata(runtimeVisibility);
  }, [generateFieldMetadata, columnVisibility]);

  // 处理列可见性变化
  const handleColumnVisibilityChange = useCallback((updater: any) => {
    setColumnVisibility(prev => {
      const newVisibility = typeof updater === 'function' ? updater(prev) : updater;
      return newVisibility;
    });
  }, []);

  // 字段配置处理函数 - 转换为TanStack Table格式
  const handleFieldConfigChange = useCallback((config: { columns: any[] }) => {
    const newVisibility: Record<string, boolean> = {};
    
    config.columns.forEach(col => {
      newVisibility[col.field] = col.visible;
    });
    
    setColumnVisibility(newVisibility);
  }, []);

  const handleFieldConfigReset = useCallback(() => {
    // 重置为默认可见性
    setColumnVisibility(getDefaultColumnVisibility());
  }, [getDefaultColumnVisibility]);

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

  // 批量操作处理

  // 批量计算处理函数
  const handleBatchCalculateInsurance = useCallback(async () => {
    if (!selectedPeriodId || selectedIds.length === 0) {
      showError('请选择薪资周期和薪资记录');
      return;
    }

    try {
      // 从选中的薪资记录中提取员工ID
      const selectedPayrolls = processedData.filter(p => 
        selectedIds.includes(p.id || p.payroll_id)
      );
      const employeeIds = selectedPayrolls.map(p => p.employee_id);

      if (employeeIds.length === 0) {
        showError('未找到对应的员工信息');
        return;
      }

      // 初始化进度模态框
      setCalculationTitle(`批量计算五险一金 (${employeeIds.length}名员工)`);
      setCalculationSteps(INSURANCE_CALCULATION_STEPS.map(step => ({
        ...step,
        status: step.id === 'insurance_prepare' ? 'running' : 'pending'
      })));
      setCurrentCalculationStep('insurance_prepare');
      setCalculationProgress(0);
      setIsCalculationProgressOpen(true);

      // 更新步骤状态
      const updateStep = (stepId: string, status: string, progress?: number, message?: string, error?: string) => {
        setCalculationSteps(prev => prev.map(step => 
          step.id === stepId ? { ...step, status, progress, message, error } : step
        ));
        setCurrentCalculationStep(stepId);
      };

      // 步骤1: 准备数据
      updateStep('insurance_prepare', 'running', 0, '正在准备五险一金计算数据...');
      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟准备时间
      updateStep('insurance_prepare', 'completed', 100, '数据准备完成');

      // 步骤2: 计算五险一金
      updateStep('insurance_calculate', 'running', 0, `正在计算 ${employeeIds.length} 名员工的五险一金...`);
      setCalculationProgress(33);

      const results = await calculateBatchInsurance({
        periodId: selectedPeriodId,
        employeeIds,
        includeOccupationalPension: true,
        saveToDatabase: true
      });

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        updateStep('insurance_calculate', 'completed', 100, `成功计算 ${successCount} 名员工${failureCount > 0 ? `，${failureCount} 名失败` : ''}`);
        setCalculationProgress(66);

        // 步骤3: 保存结果
        updateStep('insurance_save', 'running', 0, '正在保存计算结果...');
        await new Promise(resolve => setTimeout(resolve, 500)); // 模拟保存时间
        updateStep('insurance_save', 'completed', 100, '计算结果已保存');
        setCalculationProgress(100);

        showSuccess(`成功计算 ${successCount} 名员工的五险一金${failureCount > 0 ? `，${failureCount} 名失败` : ''}`);
        refetch(); // 刷新数据
      } else {
        updateStep('insurance_calculate', 'error', 0, undefined, '批量五险一金计算失败');
        showError('批量五险一金计算失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setCalculationSteps(prev => prev.map(step => 
        step.status === 'running' ? { ...step, status: 'error', error: errorMessage } : step
      ));
      showError(`批量五险一金计算失败: ${errorMessage}`);
    }
  }, [selectedPeriodId, selectedIds, processedData, calculateBatchInsurance, showSuccess, showError, refetch]);

  const handleBatchCalculatePayroll = useCallback(async () => {
    if (selectedIds.length === 0) {
      showError('请选择薪资记录');
      return;
    }

    try {
      // 初始化进度模态框
      setCalculationTitle(`批量计算薪资汇总 (${selectedIds.length}条记录)`);
      setCalculationSteps(PAYROLL_CALCULATION_STEPS.map(step => ({
        ...step,
        status: step.id === 'payroll_prepare' ? 'running' : 'pending'
      })));
      setCurrentCalculationStep('payroll_prepare');
      setCalculationProgress(0);
      setIsCalculationProgressOpen(true);

      // 更新步骤状态
      const updateStep = (stepId: string, status: string, progress?: number, message?: string, error?: string) => {
        setCalculationSteps(prev => prev.map(step => 
          step.id === stepId ? { ...step, status, progress, message, error } : step
        ));
        setCurrentCalculationStep(stepId);
      };

      // 步骤1: 准备数据
      updateStep('payroll_prepare', 'running', 0, '正在准备薪资汇总计算数据...');
      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟准备时间
      updateStep('payroll_prepare', 'completed', 100, '数据准备完成');

      // 步骤2: 计算薪资汇总
      updateStep('payroll_calculate', 'running', 0, `正在计算 ${selectedIds.length} 条薪资汇总...`);
      setCalculationProgress(33);

      const result = await payrollCalculation.calculateBatch(selectedIds, true);

      const successCount = result.summary.successCount;
      const failureCount = result.summary.failureCount;

      if (successCount > 0) {
        updateStep('payroll_calculate', 'completed', 100, `成功计算 ${successCount} 条薪资汇总${failureCount > 0 ? `，${failureCount} 条失败` : ''}`);
        setCalculationProgress(66);

        // 步骤3: 保存结果
        updateStep('payroll_save', 'running', 0, '正在保存计算结果...');
        await new Promise(resolve => setTimeout(resolve, 500)); // 模拟保存时间
        updateStep('payroll_save', 'completed', 100, '计算结果已保存');
        setCalculationProgress(100);

        showSuccess(`成功计算 ${successCount} 条薪资汇总${failureCount > 0 ? `，${failureCount} 条失败` : ''}`);
        refetch(); // 刷新数据
      } else {
        updateStep('payroll_calculate', 'error', 0, undefined, '批量薪资汇总计算失败');
        showError('批量薪资汇总计算失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setCalculationSteps(prev => prev.map(step => 
        step.status === 'running' ? { ...step, status: 'error', error: errorMessage } : step
      ));
      showError(`批量薪资汇总计算失败: ${errorMessage}`);
    }
  }, [selectedIds, payrollCalculation, showSuccess, showError, refetch]);

  const handleBatchCalculateAll = useCallback(async () => {
    if (!selectedPeriodId || selectedIds.length === 0) {
      showError('请选择薪资周期和薪资记录');
      return;
    }

    try {
      // 从选中的薪资记录中提取员工ID
      const selectedPayrolls = processedData.filter(p => 
        selectedIds.includes(p.id || p.payroll_id)
      );
      const employeeIds = selectedPayrolls.map(p => p.employee_id);

      if (employeeIds.length === 0) {
        showError('未找到对应的员工信息');
        return;
      }

      // 初始化进度模态框
      setCalculationTitle(`批量重算全部 (${employeeIds.length}名员工)`);
      setCalculationSteps(COMBINED_CALCULATION_STEPS.map(step => ({
        ...step,
        status: step.id === 'insurance_prepare' ? 'running' : 'pending'
      })));
      setCurrentCalculationStep('insurance_prepare');
      setCalculationProgress(0);
      setIsCalculationProgressOpen(true);

      // 更新步骤状态
      const updateStep = (stepId: string, status: string, progress?: number, message?: string, error?: string) => {
        setCalculationSteps(prev => prev.map(step => 
          step.id === stepId ? { ...step, status, progress, message, error } : step
        ));
        setCurrentCalculationStep(stepId);
      };

      // 第一阶段：五险一金计算
      // 步骤1: 准备五险一金数据
      updateStep('insurance_prepare', 'running', 0, '正在准备五险一金计算数据...');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('insurance_prepare', 'completed', 100, '五险一金数据准备完成');

      // 步骤2: 计算五险一金
      updateStep('insurance_calculate', 'running', 0, `正在计算 ${employeeIds.length} 名员工的五险一金...`);
      setCalculationProgress(16);

      const insuranceResults = await calculateBatchInsurance({
        periodId: selectedPeriodId,
        employeeIds,
        includeOccupationalPension: true,
        saveToDatabase: true
      });

      const insuranceSuccessCount = insuranceResults.filter(r => r.success).length;
      const insuranceFailureCount = insuranceResults.length - insuranceSuccessCount;

      if (insuranceSuccessCount > 0) {
        updateStep('insurance_calculate', 'completed', 100, `五险一金计算完成: ${insuranceSuccessCount}成功${insuranceFailureCount > 0 ? `, ${insuranceFailureCount}失败` : ''}`);
        setCalculationProgress(33);

        // 步骤3: 保存五险一金结果
        updateStep('insurance_save', 'running', 0, '正在保存五险一金计算结果...');
        await new Promise(resolve => setTimeout(resolve, 500));
        updateStep('insurance_save', 'completed', 100, '五险一金结果已保存');
        setCalculationProgress(50);
      } else {
        updateStep('insurance_calculate', 'error', 0, undefined, '五险一金计算失败');
        throw new Error('五险一金计算失败');
      }

      // 第二阶段：薪资汇总计算
      // 步骤4: 准备薪资汇总数据
      updateStep('payroll_prepare', 'running', 0, '正在准备薪资汇总计算数据...');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('payroll_prepare', 'completed', 100, '薪资汇总数据准备完成');

      // 步骤5: 计算薪资汇总
      updateStep('payroll_calculate', 'running', 0, `正在计算 ${selectedIds.length} 条薪资汇总...`);
      setCalculationProgress(66);

      const payrollResult = await payrollCalculation.calculateBatch(selectedIds, true);

      const payrollSuccessCount = payrollResult.summary.successCount;
      const payrollFailureCount = payrollResult.summary.failureCount;

      if (payrollSuccessCount > 0) {
        updateStep('payroll_calculate', 'completed', 100, `薪资汇总计算完成: ${payrollSuccessCount}成功${payrollFailureCount > 0 ? `, ${payrollFailureCount}失败` : ''}`);
        setCalculationProgress(83);

        // 步骤6: 保存薪资汇总结果
        updateStep('payroll_save', 'running', 0, '正在保存薪资汇总计算结果...');
        await new Promise(resolve => setTimeout(resolve, 500));
        updateStep('payroll_save', 'completed', 100, '薪资汇总结果已保存');
        setCalculationProgress(100);

        showSuccess(`批量重算全部完成: 五险一金 ${insuranceSuccessCount}/${employeeIds.length}，薪资汇总 ${payrollSuccessCount}/${selectedIds.length}`);
        refetch(); // 刷新数据
      } else {
        updateStep('payroll_calculate', 'error', 0, undefined, '薪资汇总计算失败');
        throw new Error('薪资汇总计算失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setCalculationSteps(prev => prev.map(step => 
        step.status === 'running' ? { ...step, status: 'error', error: errorMessage } : step
      ));
      showError(`批量重算全部失败: ${errorMessage}`);
    }
  }, [selectedPeriodId, selectedIds, processedData, calculateBatchInsurance, payrollCalculation, showSuccess, showError, refetch]);

  // 创建新的薪资批次 - 功能已移除
  // const handleCreateBatch = useCallback(() => {
  //   navigate('/payroll/create-cycle');
  // }, [navigate]);

  // 使用清空薪资周期的 hook
  const clearPayrollPeriod = useClearPayrollPeriod();

  // 清空本月数据
  const handleClearCurrentMonth = useCallback((clearStrategy: 'all' | 'draft_only' = 'draft_only') => {
    if (!selectedPeriodId) {
      showError('未选择薪资周期');
      setIsClearModalOpen(false);
      return;
    }

    // 使用新的 hook 清空数据
    clearPayrollPeriod.mutate(
      {
        periodId: selectedPeriodId,
        periodName: formatMonth(selectedMonth),
        clearStrategy  // 使用传入的清除策略
      },
      {
        onSuccess: () => {
          setIsClearModalOpen(false);
          refetch();  // 刷新数据
        },
        onError: () => {
          setIsClearModalOpen(false);
        }
      }
    );
  }, [selectedPeriodId, selectedMonth, clearPayrollPeriod, showError, refetch]);


  // 准备统计卡片数据 - 移除本地定义，使用 ManagementPageLayout 的类型
  
  const statCards: StatCardProps[] = useMemo(() => {
    if (!statistics) return [];
    
    // 只返回薪资统计的三个卡片
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

  // 计算选中记录的状态验证结果 - 用于按钮约束
  const selectedRecordsValidation = useMemo(() => {
    if (selectedIds.length === 0) {
      return {
        calculateInsurance: { canOperate: false, reason: '未选择任何记录' },
        calculatePayroll: { canOperate: false, reason: '未选择任何记录' },
        calculateAll: { canOperate: false, reason: '未选择任何记录' }
      };
    }

    // 获取选中记录的状态
    const selectedRecords = processedData.filter(record => 
      selectedIds.includes(record.id || record.payroll_id)
    );
    const selectedStatuses = selectedRecords.map(record => record.payroll_status as PayrollStatusType);

    return {
      calculateInsurance: approvalUtils.batchCanCalculateInsurance(selectedStatuses),
      calculatePayroll: approvalUtils.batchCanCalculatePayroll(selectedStatuses),
      calculateAll: approvalUtils.batchCanCalculateInsurance(selectedStatuses) // 使用相同的逻辑
    };
  }, [selectedIds, processedData, approvalUtils]);

  // 处理加载状态
  const totalLoading = isLoading || statsLoading || latestPeriodLoading || batchInsuranceLoading || payrollCalculation.loading;

  return (
    <ManagementPageLayout
      title={t('payroll:payrollManagement')}
      subtitle={t('payroll:payrollManagementDesc')}
      statCards={statCards}
      statCardsExtra={
        completenessData && (
          <PayrollCompletenessStats
            completeness={completenessData}
            onClick={() => setIsCompletenessModalOpen(true)}
          />
        )
      }
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      onSearch={handleSearch}
      onSearchReset={handleSearchReset}
      searchPlaceholder="搜索员工姓名、部门名称、状态..."
      searchLoading={totalLoading}
      showFieldSelector={true}
      fields={getFieldMetadata(tableInstance || undefined)}
      userConfig={{ 
        columns: getFieldMetadata(tableInstance || undefined).map(field => ({
          field: field.name,
          visible: field.visible,
          order: field.order,
          label: field.label,
          width: field.width
        }))
      }}
      onFieldConfigChange={handleFieldConfigChange}
      onFieldConfigReset={handleFieldConfigReset}
      primaryActions={[
        // 批量创建按钮已移除
        // <ModernButton
        //   key="create-batch"
        //   onClick={handleCreateBatch}
        //   variant="primary"
        //   size="md"
        //   icon={
        //     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
        //         d="M12 4v16m8-8H4" />
        //     </svg>
        //   }
        // >
        //   {t('payroll:createBatch')}
        // </ModernButton>,

        ...(hasPermission(PERMISSIONS.PAYROLL_CLEAR) ? [
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
      initialSorting={[{ id: 'actual_pay_date', desc: true }]}
      initialPagination={{ pageIndex: 0, pageSize: 20 }}
      initialColumnVisibility={columnVisibility}
      onColumnVisibilityChange={handleColumnVisibilityChange}
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
                {/* 月份选择器 */}
                <MonthPicker
                  value={selectedMonth}
                  onChange={(month) => {
                    setSelectedMonth(month);
                    // 解析年月
                    const [year, monthStr] = month.split('-');
                    setPeriodYear(parseInt(year));
                    setPeriodMonth(parseInt(monthStr));
                    
                    // 查找对应的周期ID
                    const monthData = availableMonths?.find(m => m.month === month);
                    if (monthData?.periodId) {
                      setSelectedPeriodId(monthData.periodId);
                    } else {
                      setSelectedPeriodId('');
                    }
                  }}
                  showDataIndicators={true}
                  availableMonths={availableMonths}
                  placeholder="选择薪资周期"
                  className="flex-shrink-0"
                  size="sm"
                  showCompletenessIndicators={true}
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
              loading={batchInsuranceLoading || payrollCalculation.loading}
              onClearSelection={() => setSelectedIds([])}
              actions={[
                {
                  key: 'calculate-insurance',
                  label: '重算五险一金',
                  onClick: handleBatchCalculateInsurance,
                  variant: 'outline',
                  disabled: !selectedRecordsValidation.calculateInsurance.canOperate,
                  title: selectedRecordsValidation.calculateInsurance.canOperate 
                    ? '批量重算五险一金' 
                    : selectedRecordsValidation.calculateInsurance.reason,
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
                  onClick: handleBatchCalculatePayroll,
                  variant: 'outline',
                  disabled: !selectedRecordsValidation.calculatePayroll.canOperate,
                  title: selectedRecordsValidation.calculatePayroll.canOperate 
                    ? '批量重算薪资汇总' 
                    : selectedRecordsValidation.calculatePayroll.reason,
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                    </svg>
                  )
                },
                {
                  key: 'calculate-all',
                  label: '重算全部',
                  onClick: handleBatchCalculateAll,
                  variant: 'outline',
                  disabled: !selectedRecordsValidation.calculateAll.canOperate,
                  title: selectedRecordsValidation.calculateAll.canOperate 
                    ? '重算全部（五险一金+薪资汇总）' 
                    : selectedRecordsValidation.calculateAll.reason,
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )
                },
                {
                  key: 'export',
                  label: '导出',
                  onClick: () => exportTableToExcel(processedData.filter(p => selectedIds.includes(p.id || p.payroll_id)), 'payroll-selected'),
                  variant: 'outline',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )
                }
              ]}
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
            periodId={selectedPeriodId}
            onConfirm={handleClearCurrentMonth}
            onCancel={() => setIsClearModalOpen(false)}
          />
          <CalculationProgressModal
            isOpen={isCalculationProgressOpen}
            onClose={() => setIsCalculationProgressOpen(false)}
            title={calculationTitle}
            steps={calculationSteps}
            currentStep={currentCalculationStep}
            totalProgress={calculationProgress}
          />
          <PayrollCompletenessModal
            isOpen={isCompletenessModalOpen}
            onClose={() => setIsCompletenessModalOpen(false)}
            completeness={completenessData || null}
            onImportData={(element) => {
              // 关闭完整度模态框
              setIsCompletenessModalOpen(false);
              // 导航到导入页面，并传递要导入的数据类型
              navigate('/payroll/import', { 
                state: { 
                  selectedMonth,
                  selectedPeriodId,
                  targetElement: element 
                }
              });
            }}
            onViewDetails={(element) => {
              // 可以在这里实现查看详情的逻辑
              console.log('View details for element:', element);
            }}
          />
        </>
      }
    />
  );
}