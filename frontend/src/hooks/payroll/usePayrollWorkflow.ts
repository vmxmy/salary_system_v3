import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';

// 导入所有相关的 hooks
import { usePayrollPeriod } from './usePayrollPeriod';
import { usePayroll } from './usePayroll';
import { usePayrollEarnings } from './usePayrollEarnings';
import { useEmployeeCategory } from './useEmployeeCategory';
import { useEmployeePosition } from './useEmployeePosition';
import { useContributionBase } from './useContributionBase';

// 工作流步骤枚举
export const WorkflowStep = {
  PERIOD_SELECTION: 'period_selection',
  EMPLOYEE_CATEGORY: 'employee_category',
  EMPLOYEE_POSITION: 'employee_position',
  CONTRIBUTION_BASE: 'contribution_base',
  EARNINGS_SETUP: 'earnings_setup',
  CALCULATION: 'calculation',
  REVIEW: 'review',
  COMPLETION: 'completion'
} as const;

export type WorkflowStepType = typeof WorkflowStep[keyof typeof WorkflowStep];

// 工作流状态接口
export interface WorkflowState {
  currentStep: WorkflowStepType;
  selectedPeriod: string | null;
  selectedEmployees: string[];
  completedSteps: WorkflowStepType[];
  errors: string[];
  warnings: string[];
  isProcessing: boolean;
}

// 工作流配置接口
export interface WorkflowConfig {
  enableAutoProgression?: boolean;
  enableValidation?: boolean;
  enableBatchOperations?: boolean;
  requiredSteps?: WorkflowStepType[];
}

// 批处理结果接口
export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    employeeId: string;
    employeeName: string;
    error: string;
  }>;
}

// 步骤验证结果接口
export interface StepValidationResult {
  isValid: boolean;
  canProceed: boolean;
  warnings: string[];
  errors: string[];
  missingData: string[];
}

// 查询键管理
export const payrollWorkflowQueryKeys = {
  all: ['payroll-workflow'] as const,
  workflow: (workflowId: string) => [...payrollWorkflowQueryKeys.all, 'workflow', workflowId] as const,
  validation: (params: any) => [...payrollWorkflowQueryKeys.all, 'validation', params] as const,
  progress: (periodId: string) => [...payrollWorkflowQueryKeys.all, 'progress', periodId] as const,
};

/**
 * 薪资创建工作流 Hook 配置选项
 */
interface UsePayrollWorkflowOptions {
  initialPeriodId?: string;
  initialEmployeeIds?: string[];
  config?: WorkflowConfig;
  enableRealtime?: boolean;
}

/**
 * 主薪资工作流管理 Hook
 */
export function usePayrollWorkflow(options: UsePayrollWorkflowOptions = {}) {
  const {
    initialPeriodId,
    initialEmployeeIds = [],
    config = {},
    enableRealtime = true
  } = options;

  const {
    enableAutoProgression = false,
    enableValidation = true,
    enableBatchOperations = true,
    requiredSteps = [
      WorkflowStep.PERIOD_SELECTION,
      WorkflowStep.EMPLOYEE_CATEGORY,
      WorkflowStep.EMPLOYEE_POSITION,
      WorkflowStep.CONTRIBUTION_BASE,
      WorkflowStep.EARNINGS_SETUP
    ]
  } = config;

  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  // 工作流状态
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    currentStep: WorkflowStep.PERIOD_SELECTION,
    selectedPeriod: initialPeriodId || null,
    selectedEmployees: initialEmployeeIds,
    completedSteps: [],
    errors: [],
    warnings: [],
    isProcessing: false
  });

  // 使用各个子 hooks
  const periodHook = usePayrollPeriod();
  const payrollHook = usePayroll();
  const earningsHook = usePayrollEarnings();
  const categoryHook = useEmployeeCategory();
  const positionHook = useEmployeePosition();
  const contributionBaseHook = useContributionBase();

  // 获取工作流进度
  const useWorkflowProgress = (periodId: string) => {
    return useQuery({
      queryKey: payrollWorkflowQueryKeys.progress(periodId),
      queryFn: async () => {
        if (!periodId) return null;

        // 获取该周期的薪资创建进度
        const progress = {
          periodId,
          totalEmployees: workflowState.selectedEmployees.length,
          completedCategories: 0,
          completedPositions: 0,
          completedBases: 0,
          completedEarnings: 0,
          createdPayrolls: 0
        };

        // 并行查询各个模块的完成情况
        const [categoriesResult, positionsResult, basesResult, payrollsResult] = await Promise.all([
          // 检查类别分配完成情况
          supabase
            .from('employee_category_assignments')
            .select('employee_id', { count: 'exact' })
            .eq('period_id', periodId)
            .in('employee_id', workflowState.selectedEmployees),
          
          // 检查职位分配完成情况
          supabase
            .from('employee_job_history')
            .select('employee_id', { count: 'exact' })
            .eq('period_id', periodId)
            .in('employee_id', workflowState.selectedEmployees),
          
          // 检查缴费基数设置完成情况
          supabase
            .from('employee_contribution_bases')
            .select('employee_id', { count: 'exact' })
            .eq('period_id', periodId)
            .in('employee_id', workflowState.selectedEmployees),
          
          // 检查薪资记录创建情况
          supabase
            .from('payrolls')
            .select('employee_id', { count: 'exact' })
            .eq('period_id', periodId)
            .in('employee_id', workflowState.selectedEmployees)
        ]);

        progress.completedCategories = categoriesResult.count || 0;
        progress.completedPositions = positionsResult.count || 0;
        progress.completedBases = basesResult.count || 0;
        progress.createdPayrolls = payrollsResult.count || 0;

        return progress;
      },
      enabled: !!periodId && workflowState.selectedEmployees.length > 0,
      staleTime: 30 * 1000, // 30秒缓存
    });
  };

  const progressQuery = useWorkflowProgress(workflowState.selectedPeriod || '');

  // 步骤验证
  const validateStep = useCallback(async (step: WorkflowStepType): Promise<StepValidationResult> => {
    const result: StepValidationResult = {
      isValid: true,
      canProceed: true,
      warnings: [],
      errors: [],
      missingData: []
    };

    if (!enableValidation) return result;

    switch (step) {
      case WorkflowStep.PERIOD_SELECTION:
        if (!workflowState.selectedPeriod) {
          result.errors.push('请选择薪资周期');
          result.isValid = false;
          result.canProceed = false;
        }
        if (workflowState.selectedEmployees.length === 0) {
          result.errors.push('请选择员工');
          result.isValid = false;
          result.canProceed = false;
        }
        break;

      case WorkflowStep.EMPLOYEE_CATEGORY:
        // 检查员工类别分配完成情况
        const categoriesResult = progressQuery.data;
        if (categoriesResult && categoriesResult.completedCategories < categoriesResult.totalEmployees) {
          const missing = categoriesResult.totalEmployees - categoriesResult.completedCategories;
          result.warnings.push(`还有 ${missing} 名员工未完成类别分配`);
          result.canProceed = false;
        }
        break;

      case WorkflowStep.EMPLOYEE_POSITION:
        // 检查员工职位分配完成情况
        const positionsResult = progressQuery.data;
        if (positionsResult && positionsResult.completedPositions < positionsResult.totalEmployees) {
          const missing = positionsResult.totalEmployees - positionsResult.completedPositions;
          result.warnings.push(`还有 ${missing} 名员工未完成职位分配`);
          result.canProceed = false;
        }
        break;

      case WorkflowStep.CONTRIBUTION_BASE:
        // 检查缴费基数设置完成情况
        const basesResult = progressQuery.data;
        if (basesResult && basesResult.completedBases < basesResult.totalEmployees * 5) { // 假设5种保险
          result.warnings.push('缴费基数设置未完成');
          result.canProceed = false;
        }
        break;

      case WorkflowStep.EARNINGS_SETUP:
        // 检查收入设置情况
        if (!workflowState.selectedPeriod) {
          result.errors.push('薪资周期未设置');
          result.isValid = false;
          result.canProceed = false;
        }
        break;

      default:
        break;
    }

    return result;
  }, [workflowState, progressQuery.data, enableValidation]);

  // 移动到下一步
  const goToNextStep = useCallback(async () => {
    const currentIndex = requiredSteps.indexOf(workflowState.currentStep);
    if (currentIndex < requiredSteps.length - 1) {
      const nextStep = requiredSteps[currentIndex + 1];
      
      // 验证当前步骤
      const validation = await validateStep(workflowState.currentStep);
      if (!validation.canProceed) {
        setWorkflowState(prev => ({
          ...prev,
          errors: validation.errors,
          warnings: validation.warnings
        }));
        return false;
      }
      
      setWorkflowState(prev => ({
        ...prev,
        currentStep: nextStep,
        completedSteps: [...prev.completedSteps, prev.currentStep],
        errors: [],
        warnings: []
      }));
      return true;
    }
    return false;
  }, [workflowState.currentStep, requiredSteps, validateStep]);

  // 移动到上一步
  const goToPreviousStep = useCallback(() => {
    const currentIndex = requiredSteps.indexOf(workflowState.currentStep);
    if (currentIndex > 0) {
      const previousStep = requiredSteps[currentIndex - 1];
      setWorkflowState(prev => ({
        ...prev,
        currentStep: previousStep,
        completedSteps: prev.completedSteps.filter(step => step !== previousStep),
        errors: [],
        warnings: []
      }));
      return true;
    }
    return false;
  }, [workflowState.currentStep, requiredSteps]);

  // 跳转到指定步骤
  const goToStep = useCallback((step: WorkflowStepType) => {
    if (requiredSteps.includes(step)) {
      setWorkflowState(prev => ({
        ...prev,
        currentStep: step,
        errors: [],
        warnings: []
      }));
      return true;
    }
    return false;
  }, [requiredSteps]);

  // 批量分配员工类别
  const batchAssignCategories = useMutation({
    mutationFn: async (params: {
      employeeIds: string[];
      categoryId: string;
      periodId: string;
    }): Promise<BatchOperationResult> => {
      const { employeeIds, categoryId, periodId } = params;
      const result: BatchOperationResult = {
        success: 0,
        failed: 0,
        errors: []
      };

      setWorkflowState(prev => ({ ...prev, isProcessing: true }));

      try {
        // 使用批量分配功能
        const assignments = employeeIds.map(employeeId => ({
          employeeId,
          categoryId,
          periodId
        }));

        await categoryHook.mutations.batchAssign.mutateAsync({ assignments });
        result.success = employeeIds.length;
      } catch (error) {
        result.failed = employeeIds.length;
        result.errors.push({
          employeeId: 'batch',
          employeeName: '批量操作',
          error: error instanceof Error ? error.message : '未知错误'
        });
      } finally {
        setWorkflowState(prev => ({ ...prev, isProcessing: false }));
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollWorkflowQueryKeys.all });
    }
  });

  // 批量分配员工职位
  const batchAssignPositions = useMutation({
    mutationFn: async (params: {
      assignments: Array<{
        employeeId: string;
        positionId: string;
        departmentId: string;
      }>;
      periodId: string;
    }): Promise<BatchOperationResult> => {
      const { assignments, periodId } = params;
      const result: BatchOperationResult = {
        success: 0,
        failed: 0,
        errors: []
      };

      setWorkflowState(prev => ({ ...prev, isProcessing: true }));

      try {
        const positionAssignments = assignments.map(assignment => ({
          ...assignment,
          periodId
        }));

        await positionHook.mutations.assignPosition.mutateAsync({ assignments: positionAssignments });
        result.success = assignments.length;
      } catch (error) {
        result.failed = assignments.length;
        result.errors.push({
          employeeId: 'batch',
          employeeName: '批量操作',
          error: error instanceof Error ? error.message : '未知错误'
        });
      } finally {
        setWorkflowState(prev => ({ ...prev, isProcessing: false }));
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollWorkflowQueryKeys.all });
    }
  });

  // 批量设置缴费基数
  const batchSetContributionBases = useMutation({
    mutationFn: async (params: {
      bases: Array<{
        employeeId: string;
        insuranceTypeId: string;
        contributionBase: number;
      }>;
      periodId: string;
    }): Promise<BatchOperationResult> => {
      const { bases, periodId } = params;
      const result: BatchOperationResult = {
        success: 0,
        failed: 0,
        errors: []
      };

      setWorkflowState(prev => ({ ...prev, isProcessing: true }));

      try {
        const baseAssignments = bases.map(base => ({
          ...base,
          periodId
        }));

        await contributionBaseHook.mutations.batchSet.mutateAsync({ bases: baseAssignments });
        result.success = bases.length;
      } catch (error) {
        result.failed = bases.length;
        result.errors.push({
          employeeId: 'batch',
          employeeName: '批量操作',
          error: error instanceof Error ? error.message : '未知错误'
        });
      } finally {
        setWorkflowState(prev => ({ ...prev, isProcessing: false }));
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollWorkflowQueryKeys.all });
    }
  });

  // 批量创建薪资记录
  const batchCreatePayrolls = useMutation({
    mutationFn: async (params: {
      employeeIds: string[];
      periodId: string;
      payDate: string;
    }): Promise<BatchOperationResult> => {
      const { employeeIds, periodId, payDate } = params;
      const result: BatchOperationResult = {
        success: 0,
        failed: 0,
        errors: []
      };

      setWorkflowState(prev => ({ ...prev, isProcessing: true }));

      try {
        await payrollHook.mutations.createBatchPayrolls.mutateAsync({
          employeeIds,
          periodId,
          payDate
        });
        result.success = employeeIds.length;
      } catch (error) {
        result.failed = employeeIds.length;
        result.errors.push({
          employeeId: 'batch',
          employeeName: '批量操作',
          error: error instanceof Error ? error.message : '未知错误'
        });
      } finally {
        setWorkflowState(prev => ({ ...prev, isProcessing: false }));
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollWorkflowQueryKeys.all });
    }
  });

  // 完整工作流执行
  const executeCompleteWorkflow = useMutation({
    mutationFn: async (params: {
      periodId: string;
      employeeIds: string[];
      defaultCategoryId: string;
      employeePositions: Array<{
        employeeId: string;
        positionId: string;
        departmentId: string;
      }>;
      payDate: string;
    }) => {
      const { periodId, employeeIds, defaultCategoryId, employeePositions, payDate } = params;
      
      setWorkflowState(prev => ({ 
        ...prev, 
        isProcessing: true,
        selectedPeriod: periodId,
        selectedEmployees: employeeIds
      }));

      try {
        // 步骤1: 分配员工类别
        setWorkflowState(prev => ({ ...prev, currentStep: WorkflowStep.EMPLOYEE_CATEGORY }));
        await batchAssignCategories.mutateAsync({
          employeeIds,
          categoryId: defaultCategoryId,
          periodId
        });

        // 步骤2: 分配员工职位
        setWorkflowState(prev => ({ ...prev, currentStep: WorkflowStep.EMPLOYEE_POSITION }));
        await batchAssignPositions.mutateAsync({
          assignments: employeePositions,
          periodId
        });

        // 步骤3: 自动计算并设置缴费基数
        setWorkflowState(prev => ({ ...prev, currentStep: WorkflowStep.CONTRIBUTION_BASE }));
        for (const employeeId of employeeIds) {
          const calculatedBases = await contributionBaseHook.mutations.calculate.mutateAsync({
            employeeId,
            periodId
          });
          
          if (calculatedBases && calculatedBases.length > 0) {
            const bases = calculatedBases.map(base => ({
              employeeId,
              insuranceTypeId: base.insurance_type_id,
              contributionBase: base.contribution_base
            }));
            
            await batchSetContributionBases.mutateAsync({
              bases,
              periodId
            });
          }
        }

        // 步骤4: 创建薪资记录
        setWorkflowState(prev => ({ ...prev, currentStep: WorkflowStep.EARNINGS_SETUP }));
        await batchCreatePayrolls.mutateAsync({
          employeeIds,
          periodId,
          payDate
        });

        setWorkflowState(prev => ({ 
          ...prev, 
          currentStep: WorkflowStep.COMPLETION,
          completedSteps: requiredSteps,
          isProcessing: false
        }));

        return { success: true, message: '薪资工作流执行完成' };
      } catch (error) {
        setWorkflowState(prev => ({ 
          ...prev, 
          isProcessing: false,
          errors: [error instanceof Error ? error.message : '工作流执行失败']
        }));
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollWorkflowQueryKeys.all });
    }
  });

  // 重置工作流
  const resetWorkflow = useCallback(() => {
    setWorkflowState({
      currentStep: WorkflowStep.PERIOD_SELECTION,
      selectedPeriod: null,
      selectedEmployees: [],
      completedSteps: [],
      errors: [],
      warnings: [],
      isProcessing: false
    });
  }, []);

  // 更新选中的员工
  const updateSelectedEmployees = useCallback((employeeIds: string[]) => {
    setWorkflowState(prev => ({
      ...prev,
      selectedEmployees: employeeIds
    }));
  }, []);

  // 更新选中的周期
  const updateSelectedPeriod = useCallback((periodId: string) => {
    setWorkflowState(prev => ({
      ...prev,
      selectedPeriod: periodId
    }));
  }, []);

  return {
    // 工作流状态
    workflowState,
    progress: progressQuery.data,
    
    // 步骤管理
    currentStep: workflowState.currentStep,
    completedSteps: workflowState.completedSteps,
    canGoNext: workflowState.currentStep !== requiredSteps[requiredSteps.length - 1],
    canGoPrevious: workflowState.currentStep !== requiredSteps[0],
    
    // 加载状态
    loading: {
      isProcessing: workflowState.isProcessing,
      progress: progressQuery.isLoading,
      categories: batchAssignCategories.isPending,
      positions: batchAssignPositions.isPending,
      bases: batchSetContributionBases.isPending,
      payrolls: batchCreatePayrolls.isPending,
      workflow: executeCompleteWorkflow.isPending
    },

    // 错误和警告
    errors: workflowState.errors,
    warnings: workflowState.warnings,

    // 子 hooks 数据
    hooks: {
      period: periodHook,
      payroll: payrollHook,
      earnings: earningsHook,
      category: categoryHook,
      position: positionHook,
      contributionBase: contributionBaseHook
    },

    // 批量操作 mutations
    mutations: {
      batchAssignCategories,
      batchAssignPositions,
      batchSetContributionBases,
      batchCreatePayrolls,
      executeCompleteWorkflow
    },

    // 操作方法
    actions: {
      // 步骤导航
      goToNextStep,
      goToPreviousStep,
      goToStep,
      validateStep,
      
      // 工作流控制
      resetWorkflow,
      updateSelectedEmployees,
      updateSelectedPeriod,
      
      // 批量操作
      batchAssignCategories: batchAssignCategories.mutate,
      batchAssignPositions: batchAssignPositions.mutate,
      batchSetContributionBases: batchSetContributionBases.mutate,
      batchCreatePayrolls: batchCreatePayrolls.mutate,
      executeCompleteWorkflow: executeCompleteWorkflow.mutate
    },

    // 工具方法
    utils: {
      getStepProgress: (step: WorkflowStepType) => {
        const progress = progressQuery.data;
        if (!progress) return 0;
        
        switch (step) {
          case WorkflowStep.EMPLOYEE_CATEGORY:
            return progress.totalEmployees > 0 ? (progress.completedCategories / progress.totalEmployees) * 100 : 0;
          case WorkflowStep.EMPLOYEE_POSITION:
            return progress.totalEmployees > 0 ? (progress.completedPositions / progress.totalEmployees) * 100 : 0;
          case WorkflowStep.CONTRIBUTION_BASE:
            const expectedBases = progress.totalEmployees * 5; // 假设5种保险
            return expectedBases > 0 ? (progress.completedBases / expectedBases) * 100 : 0;
          case WorkflowStep.EARNINGS_SETUP:
            return progress.totalEmployees > 0 ? (progress.createdPayrolls / progress.totalEmployees) * 100 : 0;
          default:
            return 0;
        }
      },
      
      getStepName: (step: WorkflowStepType) => {
        const stepNames = {
          [WorkflowStep.PERIOD_SELECTION]: '选择薪资周期',
          [WorkflowStep.EMPLOYEE_CATEGORY]: '员工身份类别',
          [WorkflowStep.EMPLOYEE_POSITION]: '员工职务信息',
          [WorkflowStep.CONTRIBUTION_BASE]: '缴费基数设置',
          [WorkflowStep.EARNINGS_SETUP]: '收入明细设置',
          [WorkflowStep.CALCULATION]: '薪资计算',
          [WorkflowStep.REVIEW]: '审核确认',
          [WorkflowStep.COMPLETION]: '完成'
        };
        return stepNames[step] || step;
      },
      
      isStepCompleted: (step: WorkflowStepType) => {
        return workflowState.completedSteps.includes(step);
      },
      
      getOverallProgress: () => {
        const totalSteps = requiredSteps.length;
        const completedSteps = workflowState.completedSteps.length;
        return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
      }
    },

    // 常量
    WorkflowStep,
    requiredSteps
  };
}