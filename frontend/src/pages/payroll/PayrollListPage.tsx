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
import { 
  PayrollBatchActions, 
  PayrollDetailModal, 
  CalculationProgressModal,
  BatchApprovalProgressModal,
  createBatchApprovalItems,
  updateBatchApprovalItem,
  calculateBatchSummary,
  type BatchApprovalItem,
  PayrollTableContainer,
  PayrollSearchAndFilter,
  PayrollPeriodSelector,
  INSURANCE_CALCULATION_STEPS, 
  PAYROLL_CALCULATION_STEPS, 
  COMBINED_CALCULATION_STEPS 
} from '@/components/payroll';
import { ClearPayrollModal } from '@/components/payroll/ClearPayrollModal';
import { PayrollCompletenessModal } from '@/components/payroll/PayrollCompletenessModal';
import { PayrollCompletenessStats } from '@/components/payroll/PayrollCompletenessStats';
import { usePayrollPeriodCompleteness } from '@/hooks/payroll/usePayrollPeriodCompleteness';
import { ConfirmModal, BatchConfirmModal } from '@/components/common/ConfirmModal';
import { ManagementPageLayout, type StatCardProps } from '@/components/layout/ManagementPageLayout';
import { useToast } from '@/contexts/ToastContext';
import { getMonthDateRange, getCurrentYearMonth, formatMonth } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { usePermission, PERMISSIONS } from '@/hooks/core';
import { useAuth } from '@/hooks/useAuth';
import { exportTableToCSV, exportTableToJSON, exportTableToExcel } from '@/components/common/DataTable/utils';
import type { FieldMetadata } from '@/components/common/FieldSelector';
import { createDataTableColumnHelper } from '@/components/common/DataTable/utils';
import { usePayrollDataProcessor } from '@/hooks/payroll/usePayrollDataProcessor';
import { usePayrollBatchValidation } from '@/hooks/payroll/usePayrollBatchValidation';
import { usePayrollModalManager } from '@/hooks/payroll/usePayrollModalManager';
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
  const auth = useAuth();

  // 使用通用模态框管理Hook
  const modalManager = usePayrollModalManager<PayrollData>();

  // 状态管理
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // 默认为当前月份，将在useEffect中更新为最近有记录的月份
    return getCurrentYearMonth();
  });
  
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayrollStatusType | 'all'>('all');
  
  // 其他模态框状态
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isCompletenessModalOpen, setIsCompletenessModalOpen] = useState(false);
  
  // 确认模态框状态
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'submit';
    loading: boolean;
  }>({ open: false, type: 'submit', loading: false });

  // 计算进度模态框状态
  const [calculationSteps, setCalculationSteps] = useState<any[]>([]);
  const [currentCalculationStep, setCurrentCalculationStep] = useState<string>('');
  const [calculationProgress, setCalculationProgress] = useState(0);

  // 提交审批进度模态框状态
  const [submitProgressModal, setSubmitProgressModal] = useState<{
    open: boolean;
    items: BatchApprovalItem[];
    currentItemId?: string;
    totalProgress: number;
    allowCancel: boolean;
  }>({
    open: false,
    items: [],
    currentItemId: '',
    totalProgress: 0,
    allowCancel: true
  });
  
  const submitAbortControllerRef = useRef<AbortController | null>(null);

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

  // 使用数据处理Hook - 提取实际的数据数组
  const { processedData: allData } = usePayrollDataProcessor<PayrollData>((rawData as any)?.data || []);
  
  // 应用搜索和筛选
  const processedData = useMemo(() => {
    let filteredData = [...(allData || [])];
    
    // 状态筛选
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(item => {
        const itemStatus = item.payroll_status || item.status;
        return itemStatus === statusFilter;
      });
    }
    
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredData = filteredData.filter(item => {
        return (
          item.employee_name?.toLowerCase().includes(query) ||
          item.department_name?.toLowerCase().includes(query) ||
          item.position_name?.toLowerCase().includes(query) ||
          item.category_name?.toLowerCase().includes(query) ||
          item.payroll_status?.toLowerCase().includes(query)
        );
      });
    }
    
    return filteredData;
  }, [allData, statusFilter, searchQuery]);

  // 使用批量验证Hook
  const batchValidation = usePayrollBatchValidation(selectedIds, processedData);

  // 创建表格列定义
  const columnHelper = createDataTableColumnHelper<PayrollData>();
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

  // 获取统计数据
  const { data: statistics, isLoading: statsLoading } = usePayrollStatistics(selectedMonth);
  
  // 获取四要素完整度数据
  const { data: completenessData, isLoading: completenessLoading } = usePayrollPeriodCompleteness(selectedPeriodId);
  
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

  // 获取批量操作Hook
  const { 
    calculateBatchInsurance, 
    loading: batchInsuranceLoading 
  } = useBatchInsuranceCalculation();

  const payrollCalculation = usePayrollCalculation();

  const approval = usePayrollApproval();
  const clearPeriod = useClearPayrollPeriod();
  
  // 处理批量提交审批
  const handleBatchSubmit = useCallback(async () => {
    if (selectedIds.length === 0) {
      showError('请选择要提交的记录');
      return;
    }

    // 关闭确认模态框
    setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
    
    // 启动提交进度模态框
    startSubmitOperation();
  }, [selectedIds, showError]);

  // 启动提交操作
  const startSubmitOperation = useCallback(() => {
    // 从薪资列表数据中筛选选中的记录
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
    executeSubmitOperation(items);
  }, [selectedIds, allData]);

  // 执行提交操作
  const executeSubmitOperation = useCallback(async (items: BatchApprovalItem[]) => {
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
      
      // 操作完成，清空选择并触发成功回调
      setTimeout(() => {
        setSelectedIds([]);
        // 刷新数据
        // payrollsQuery.refetch();
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
  }, [selectedIds, approval.mutations.submitForApproval]);

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


  // 统计卡片数据
  const statCards: StatCardProps[] = useMemo(() => [
    {
      title: '总记录数',
      value: processedData?.length?.toString() ?? '0',
      icon: '👥'
    },
    {
      title: '总应发金额',
      value: formatCurrency(processedData?.reduce((sum, item) => sum + (item.gross_pay || 0), 0) ?? 0),
      icon: '💰'
    },
    {
      title: '总扣发金额',
      value: formatCurrency(processedData?.reduce((sum, item) => sum + (item.total_deductions || 0), 0) ?? 0),
      icon: '📉'
    },
    {
      title: '总实发金额',
      value: formatCurrency(processedData?.reduce((sum, item) => sum + (item.net_pay || 0), 0) ?? 0),
      icon: '💵'
    }
  ], [processedData, statsLoading, completenessLoading]);

  // 周期变更处理
  const handleMonthChange = useCallback((month: string) => {
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
      console.warn(`No period found for ${month}`);
      setSelectedMonth(month);
      setPeriodYear(year);
      setPeriodMonth(monthNum);
      setSelectedPeriodId('');
      setSelectedIds([]);
    }
  }, [availableMonths]);

  // 清空当月数据处理
  const handleClearCurrentMonth = useCallback(async (onProgress?: (step: string, completed: number, total: number) => void) => {
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
  }, [selectedPeriodId, selectedMonth, clearPeriod, showSuccess, showError, refetch]);

  // 批量计算五险一金
  const handleBatchCalculateInsurance = useCallback(async () => {
    if (!selectedPeriodId) {
      showError('请先选择薪资周期');
      return;
    }

    if (selectedIds.length === 0) {
      showError('请选择要计算的记录');
      return;
    }

    try {
      // 从选中的薪资记录中提取员工ID
      const employeeIds = processedData
        .filter(p => selectedIds.includes(p.id || p.payroll_id || ''))
        .map(p => p.employee_id)
        .filter(Boolean) as string[];

      if (employeeIds.length === 0) {
        showError('未找到对应的员工信息');
        return;
      }

      // 初始化进度模态框
      modalManager.calculationProgress.open(`批量重算五险一金 (${employeeIds.length}名员工)`, INSURANCE_CALCULATION_STEPS.map(step => ({
        ...step,
        status: step.id === 'prepare' ? 'running' : 'pending'
      })));

      setCurrentCalculationStep('prepare');
      setCalculationProgress(0);

      // 更新步骤状态的辅助函数
      const updateStep = (stepId: string, status: string, progress?: number, message?: string, error?: string) => {
        setCalculationSteps(prev => prev.map(step => 
          step.id === stepId ? { ...step, status, progress, message, error } : step
        ));
        setCurrentCalculationStep(stepId);
      };

      // 步骤1: 准备数据
      updateStep('prepare', 'running', 0, '正在准备五险一金计算数据...');
      setCalculationProgress(10);
      
      // 步骤2: 计算五险一金 - 使用批量API，一次完成所有员工的计算
      updateStep('calculate', 'running', 0, `正在批量计算 ${employeeIds.length} 名员工的五险一金...`);
      setCalculationProgress(30);

      const results = await calculateBatchInsurance({
        periodId: selectedPeriodId,
        employeeIds,
        includeOccupationalPension: true,
        saveToDatabase: true
      });

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      // 步骤3: 批量操作完成，统一更新状态
      updateStep('prepare', 'completed', 100, '数据准备完成');
      setCalculationProgress(70);

      if (successCount > 0) {
        updateStep('calculate', 'completed', 100, `五险一金批量计算完成: ${successCount}成功${failureCount > 0 ? `, ${failureCount}失败` : ''}`);
        setCalculationProgress(100);

        showSuccess(`批量计算五险一金完成: ${successCount}/${employeeIds.length}`);
        refetch(); // 刷新数据
      } else {
        updateStep('calculate', 'error', 0, undefined, '五险一金计算失败');
        throw new Error('五险一金计算失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setCalculationSteps(prev => prev.map(step => 
        step.status === 'running' ? { ...step, status: 'error', error: errorMessage } : step
      ));
      showError(`批量计算五险一金失败: ${errorMessage}`);
    }
  }, [selectedPeriodId, selectedIds, processedData, calculateBatchInsurance, modalManager, showSuccess, showError, refetch]);

  // 批量计算薪资汇总
  const handleBatchCalculatePayroll = useCallback(async () => {
    if (selectedIds.length === 0) {
      showError('请选择要计算的记录');
      return;
    }

    try {
      // 初始化进度模态框
      modalManager.calculationProgress.open(`批量重算薪资汇总 (${selectedIds.length}条记录)`, PAYROLL_CALCULATION_STEPS.map(step => ({
        ...step,
        status: step.id === 'prepare' ? 'running' : 'pending'
      })));

      setCurrentCalculationStep('prepare');
      setCalculationProgress(0);

      // 更新步骤状态
      const updateStep = (stepId: string, status: string, progress?: number, message?: string, error?: string) => {
        setCalculationSteps(prev => prev.map(step => 
          step.id === stepId ? { ...step, status, progress, message, error } : step
        ));
        setCurrentCalculationStep(stepId);
      };

      // 步骤1: 准备薪资汇总数据
      updateStep('prepare', 'running', 0, '正在准备薪资汇总计算数据...');
      setCalculationProgress(10);

      // 步骤2: 计算薪资汇总 - 使用批量API，一次完成所有记录的计算
      updateStep('calculate', 'running', 0, `正在批量计算 ${selectedIds.length} 条薪资汇总...`);
      setCalculationProgress(30);

      const result = await payrollCalculation.calculateBatch(selectedIds, true);

      const successCount = result.summary.successCount;
      const failureCount = result.summary.failureCount;

      // 步骤3: 批量操作完成，统一更新状态
      updateStep('prepare', 'completed', 100, '薪资汇总数据准备完成');
      setCalculationProgress(70);

      if (successCount > 0) {
        updateStep('calculate', 'completed', 100, `薪资汇总批量计算完成: ${successCount}成功${failureCount > 0 ? `, ${failureCount}失败` : ''}`);
        setCalculationProgress(100);

        showSuccess(`批量计算薪资汇总完成: ${successCount}/${selectedIds.length}`);
        refetch(); // 刷新数据
      } else {
        updateStep('calculate', 'error', 0, undefined, '薪资汇总计算失败');
        throw new Error('薪资汇总计算失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setCalculationSteps(prev => prev.map(step => 
        step.status === 'running' ? { ...step, status: 'error', error: errorMessage } : step
      ));
      showError(`批量计算薪资汇总失败: ${errorMessage}`);
    }
  }, [selectedIds, payrollCalculation, modalManager, showSuccess, showError, refetch]);

  // 批量重算全部（五险一金+薪资汇总）
  const handleBatchCalculateAll = useCallback(async () => {
    if (!selectedPeriodId) {
      showError('请先选择薪资周期');
      return;
    }

    if (selectedIds.length === 0) {
      showError('请选择要计算的记录');
      return;
    }

    try {
      // 从选中的薪资记录中提取员工ID
      const employeeIds = processedData
        .filter(p => selectedIds.includes(p.id || p.payroll_id || ''))
        .map(p => p.employee_id)
        .filter(Boolean) as string[];

      if (employeeIds.length === 0) {
        showError('未找到对应的员工信息');
        return;
      }

      // 初始化进度模态框
      modalManager.calculationProgress.open(`批量重算全部 (${employeeIds.length}名员工)`, COMBINED_CALCULATION_STEPS.map(step => ({
        ...step,
        status: step.id === 'insurance_prepare' ? 'running' : 'pending'
      })));

      setCurrentCalculationStep('insurance_prepare');
      setCalculationProgress(0);

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
      setCalculationProgress(10);

      // 步骤2: 批量计算五险一金 - 使用批量API
      updateStep('insurance_calculate', 'running', 0, `正在批量计算 ${employeeIds.length} 名员工的五险一金...`);
      setCalculationProgress(20);

      const insuranceResults = await calculateBatchInsurance({
        periodId: selectedPeriodId,
        employeeIds,
        includeOccupationalPension: true,
        saveToDatabase: true
      });

      const insuranceSuccessCount = insuranceResults.filter(r => r.success).length;
      const insuranceFailureCount = insuranceResults.length - insuranceSuccessCount;

      if (insuranceSuccessCount > 0) {
        // 五险一金阶段完成，统一更新状态
        updateStep('insurance_prepare', 'completed', 100, '五险一金数据准备完成');
        updateStep('insurance_calculate', 'completed', 100, `五险一金批量计算完成: ${insuranceSuccessCount}成功${insuranceFailureCount > 0 ? `, ${insuranceFailureCount}失败` : ''}`);
        updateStep('insurance_save', 'completed', 100, '五险一金结果已保存');
        setCalculationProgress(50);
      } else {
        updateStep('insurance_calculate', 'error', 0, undefined, '五险一金计算失败');
        throw new Error('五险一金计算失败');
      }

      // 第二阶段：薪资汇总计算
      // 步骤4: 准备薪资汇总数据
      updateStep('payroll_prepare', 'running', 0, '正在准备薪资汇总计算数据...');
      setCalculationProgress(60);

      // 步骤5: 批量计算薪资汇总 - 使用批量API
      updateStep('payroll_calculate', 'running', 0, `正在批量计算 ${selectedIds.length} 条薪资汇总...`);
      setCalculationProgress(70);

      const payrollResult = await payrollCalculation.calculateBatch(selectedIds, true);

      const payrollSuccessCount = payrollResult.summary.successCount;
      const payrollFailureCount = payrollResult.summary.failureCount;

      if (payrollSuccessCount > 0) {
        // 薪资汇总阶段完成，统一更新状态
        updateStep('payroll_prepare', 'completed', 100, '薪资汇总数据准备完成');
        updateStep('payroll_calculate', 'completed', 100, `薪资汇总批量计算完成: ${payrollSuccessCount}成功${payrollFailureCount > 0 ? `, ${payrollFailureCount}失败` : ''}`);
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
  }, [selectedPeriodId, selectedIds, processedData, calculateBatchInsurance, payrollCalculation, modalManager, showSuccess, showError, refetch]);

  return (
    <ManagementPageLayout
      title="薪资管理"
      loading={totalLoading}
      exportComponent={null}
      customContent={
        <div className="space-y-6">



          {/* 统计数据卡片 */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
            <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              统计数据
            </h3>
            <div className="stats stats-horizontal shadow w-full bg-base-100">
              {statCards.map((stat, index) => (
                <div key={index} className="stat">
                  <div className="stat-figure text-3xl">{stat.icon}</div>
                  <div className="stat-title text-base-content/60">{stat.title}</div>
                  <div className={`stat-value text-2xl ${stat.colorClass || 'text-base-content'}`}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 四要素完整度卡片 */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
            <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              四要素完整度
            </h3>
            <PayrollCompletenessStats
              completeness={completenessData || null}
              className="w-full"
            />
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
                    payrollCount: m.payrollCount || 0  // 传递实际的记录数量
                  }))}
                  onMonthChange={handleMonthChange}
                  isLoading={latestPeriodLoading}
                  showCompletenessIndicators={true}
                  size="sm"
                />
                
                {/* 状态选择器 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-base-content/70 whitespace-nowrap">状态：</span>
                  <select 
                    className="select select-bordered select-sm bg-base-100 w-28"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as PayrollStatusType | 'all')}
                  >
                    <option value="all">全部状态</option>
                    <option value="draft">草稿</option>
                    <option value="calculated">已计算</option>
                    <option value="approved">已审批</option>
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
                    disabled={totalLoading}
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
                {/* 导出按钮 */}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => exportTableToExcel(processedData, 'payroll-all')}
                  title="导出全部数据"
                  disabled={!processedData || processedData.length === 0}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  导出全部
                </button>

                {/* 清空按钮 */}
                {hasPermission(PERMISSIONS.PAYROLL_CLEAR) && (
                  <button
                    className="btn btn-error btn-sm"
                    onClick={() => setIsClearModalOpen(true)}
                    title="清空本月薪资数据（需要薪资清除权限）"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    清空本月
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 批量操作区域 */}
          {selectedIds.length > 0 && (
            <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
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
                    disabled: !batchValidation.canBatchOperate.calculateInsurance(),
                    title: batchValidation.canBatchOperate.calculateInsurance() 
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
                    onClick: handleBatchCalculatePayroll,
                    variant: 'outline',
                    disabled: !batchValidation.canBatchOperate.calculatePayroll(),
                    title: batchValidation.canBatchOperate.calculatePayroll() 
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
                    key: 'calculate-all',
                    label: '重算全部',
                    onClick: handleBatchCalculateAll,
                    variant: 'outline',
                    disabled: !batchValidation.canBatchOperate.calculateAll(),
                    title: batchValidation.canBatchOperate.calculateAll() 
                      ? '重算全部（五险一金+薪资汇总）' 
                      : batchValidation.getOperationReason.calculateAll(),
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )
                  },
                  {
                    key: 'submit',
                    label: '提交审批',
                    onClick: () => setConfirmModal({ open: true, type: 'submit', loading: false }),
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
                    onClick: () => exportTableToExcel(processedData.filter(p => selectedIds.includes(p.id || p.payroll_id || '')), 'payroll-selected'),
                    variant: 'outline',
                    title: '导出选中的薪资记录',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )
                  }
                ]}
              />
            </div>
          )}

          {/* 表格容器 */}
          <PayrollTableContainer
            data={processedData}
            columns={columns}
            loading={isLoading}
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
          <ClearPayrollModal
            isOpen={isClearModalOpen}
            month={formatMonth(selectedMonth)}
            periodId={selectedPeriodId}
            onConfirm={handleClearCurrentMonth}
            onCancel={() => setIsClearModalOpen(false)}
          />
          <CalculationProgressModal
            isOpen={modalManager.calculationProgress.isOpen()}
            onClose={modalManager.calculationProgress.close}
            title={modalManager.calculationProgress.state().title || ''}
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
          
          {/* 提交审批确认模态框 */}
          <BatchConfirmModal
            open={confirmModal.open && confirmModal.type === 'submit'}
            action="提交审批"
            selectedCount={selectedIds.length}
            variant="primary"
            loading={confirmModal.loading}
            onConfirm={handleBatchSubmit}
            onClose={() => setConfirmModal(prev => ({ ...prev, open: false, loading: false }))}
          />

          {/* 提交审批进度模态框 */}
          <BatchApprovalProgressModal
            isOpen={submitProgressModal.open}
            onClose={closeSubmitProgressModal}
            title="批量提交审批"
            operationType="approve"
            items={submitProgressModal.items}
            currentItemId={submitProgressModal.currentItemId}
            totalProgress={submitProgressModal.totalProgress}
            allowCancel={submitProgressModal.allowCancel}
            onCancel={cancelSubmitOperation}
            summary={submitProgressModal.items.length > 0 ? calculateBatchSummary(submitProgressModal.items) : undefined}
          />
        </>
      }
    />
  );
}