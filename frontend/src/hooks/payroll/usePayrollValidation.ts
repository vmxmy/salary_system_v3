import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { useLoadingState } from '@/hooks/core/useLoadingState';
import type { Database } from '@/types/supabase';

// 类型定义
type Payroll = Database['public']['Tables']['payrolls']['Row'];

// 验证规则类型
export type ValidationRuleType = 
  | 'required_field'
  | 'range_check'
  | 'logical_consistency'
  | 'data_integrity'
  | 'business_rule';

// 验证严重程度
export type ValidationSeverity = 'error' | 'warning' | 'info';

// 验证问题
export interface ValidationIssue {
  id: string;
  payrollId: string;
  employeeId: string;
  employeeName: string;
  field?: string;
  ruleType: ValidationRuleType;
  severity: ValidationSeverity;
  message: string;
  value?: any;
  expectedValue?: any;
  suggestion?: string;
}

// 验证规则
export interface ValidationRule {
  id: string;
  name: string;
  type: ValidationRuleType;
  field?: string;
  condition: (payroll: any) => boolean;
  message: string;
  severity: ValidationSeverity;
  autoFix?: (payroll: any) => any;
}

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  totalPayrolls: number;
  validPayrolls: number;
  invalidPayrolls: number;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
  summary: {
    byType: Record<ValidationRuleType, number>;
    bySeverity: Record<ValidationSeverity, number>;
    byEmployee: Record<string, number>;
  };
}

// 验证配置
export interface ValidationConfig {
  periodId?: string;
  employeeIds?: string[];
  departmentIds?: string[];
  rules?: ValidationRule[];
  skipWarnings?: boolean;
  autoFix?: boolean;
}

// 查询键管理
export const payrollValidationQueryKeys = {
  all: ['payroll-validation'] as const,
  rules: () => [...payrollValidationQueryKeys.all, 'rules'] as const,
  result: (config: ValidationConfig) => [...payrollValidationQueryKeys.all, 'result', config] as const,
};

// 默认验证规则
const defaultValidationRules: ValidationRule[] = [
  {
    id: 'rule-1',
    name: '应发工资不能为负',
    type: 'range_check',
    field: 'gross_pay',
    condition: (payroll) => payroll.gross_pay >= 0,
    message: '应发工资不能为负数',
    severity: 'error'
  },
  {
    id: 'rule-2',
    name: '实发工资计算检查',
    type: 'logical_consistency',
    condition: (payroll) => {
      const calculated = payroll.gross_pay - payroll.total_deductions;
      return Math.abs(calculated - payroll.net_pay) < 0.01;
    },
    message: '实发工资计算不正确',
    severity: 'error',
    autoFix: (payroll) => ({
      ...payroll,
      net_pay: payroll.gross_pay - payroll.total_deductions
    })
  },
  {
    id: 'rule-3',
    name: '扣款不能超过应发工资',
    type: 'business_rule',
    condition: (payroll) => payroll.total_deductions <= payroll.gross_pay,
    message: '扣款总额超过应发工资',
    severity: 'error'
  },
  {
    id: 'rule-4',
    name: '最低工资检查',
    type: 'business_rule',
    field: 'net_pay',
    condition: (payroll) => payroll.net_pay >= 2000, // 假设最低工资为2000
    message: '实发工资低于最低工资标准',
    severity: 'warning'
  },
  {
    id: 'rule-5',
    name: '异常高薪检查',
    type: 'range_check',
    field: 'gross_pay',
    condition: (payroll) => payroll.gross_pay <= 100000, // 假设上限为10万
    message: '应发工资异常高，请检查是否有误',
    severity: 'warning'
  }
];

/**
 * 薪资验证 Hook
 * 提供薪资数据验证和自动修复功能
 */
export function usePayrollValidation() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const { loadingState, setLoading, withLoading } = useLoadingState();
  
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activeRules, setActiveRules] = useState<ValidationRule[]>(defaultValidationRules);

  // 获取验证规则
  const useValidationRules = () => {
    return useQuery({
      queryKey: payrollValidationQueryKeys.rules(),
      queryFn: async () => {
        // TODO: 从数据库获取自定义规则
        // 现在返回默认规则
        return defaultValidationRules;
      },
      staleTime: Infinity // 规则不经常变化
    });
  };

  // 获取待验证的薪资数据
  const fetchPayrollsForValidation = useCallback(async (config: ValidationConfig) => {
    let query = supabase
      .from('view_payroll_summary')
      .select('*');

    if (config.periodId) {
      query = query.eq('period_id', config.periodId);
    }

    if (config.employeeIds && config.employeeIds.length > 0) {
      query = query.in('employee_id', config.employeeIds);
    }

    if (config.departmentIds && config.departmentIds.length > 0) {
      query = query.in('department_id', config.departmentIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }, []);

  // 验证单条薪资记录
  const validatePayroll = useCallback((
    payroll: any,
    rules: ValidationRule[]
  ): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    rules.forEach(rule => {
      try {
        const isValid = rule.condition(payroll);
        if (!isValid) {
          issues.push({
            id: `${payroll.payroll_id}-${rule.id}`,
            payrollId: payroll.payroll_id,
            employeeId: payroll.employee_id,
            employeeName: payroll.employee_name,
            field: rule.field,
            ruleType: rule.type,
            severity: rule.severity,
            message: rule.message,
            value: rule.field ? payroll[rule.field] : undefined,
            suggestion: rule.autoFix ? '可以自动修复此问题' : undefined
          });
        }
      } catch (error) {
        console.error(`验证规则 ${rule.id} 执行失败:`, error);
      }
    });

    return issues;
  }, []);

  // 批量验证薪资
  const validatePayrolls = useMutation({
    mutationFn: async (config: ValidationConfig): Promise<ValidationResult> => {
      setLoading('isValidating', true);
      
      try {
        // 1. 获取薪资数据
        const payrolls = await fetchPayrollsForValidation(config);
        
        // 2. 获取验证规则
        const rules = config.rules || activeRules;
        
        // 3. 逐条验证
        const allIssues: ValidationIssue[] = [];
        const invalidPayrollIds = new Set<string>();
        
        payrolls.forEach(payroll => {
          const issues = validatePayroll(payroll, rules);
          if (issues.length > 0) {
            allIssues.push(...issues);
            invalidPayrollIds.add(payroll.payroll_id);
          }
        });

        // 4. 汇总结果
        const errors = allIssues.filter(i => i.severity === 'error');
        const warnings = allIssues.filter(i => i.severity === 'warning');
        const infos = allIssues.filter(i => i.severity === 'info');

        // 5. 统计信息
        const summary = {
          byType: allIssues.reduce((acc, issue) => {
            acc[issue.ruleType] = (acc[issue.ruleType] || 0) + 1;
            return acc;
          }, {} as Record<ValidationRuleType, number>),
          bySeverity: {
            error: errors.length,
            warning: warnings.length,
            info: infos.length
          },
          byEmployee: allIssues.reduce((acc, issue) => {
            acc[issue.employeeId] = (acc[issue.employeeId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        };

        const result: ValidationResult = {
          isValid: errors.length === 0 && (!config.skipWarnings || warnings.length === 0),
          totalPayrolls: payrolls.length,
          validPayrolls: payrolls.length - invalidPayrollIds.size,
          invalidPayrolls: invalidPayrollIds.size,
          issues: allIssues,
          errors,
          warnings,
          summary
        };

        setValidationResult(result);
        return result;
      } finally {
        setLoading('isValidating', false);
      }
    },
    onError: (error) => {
      handleError(error, { customMessage: '验证失败' });
    }
  });

  // 自动修复问题
  const autoFixIssues = useMutation({
    mutationFn: async (issueIds: string[]) => {
      setLoading('isFixing', true);
      
      try {
        const fixedCount = 0;
        const failedFixes: string[] = [];

        // 找出可以自动修复的问题
        const fixableIssues = validationResult?.issues.filter(
          issue => issueIds.includes(issue.id) && 
          activeRules.find(r => r.id === issue.id.split('-')[1])?.autoFix
        ) || [];

        // TODO: 实现自动修复逻辑
        // 这里需要根据具体的修复规则更新数据库

        return {
          success: failedFixes.length === 0,
          fixedCount,
          failedFixes
        };
      } finally {
        setLoading('isFixing', false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
    onError: (error) => {
      handleError(error, { customMessage: '自动修复失败' });
    }
  });

  // 清除验证结果
  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  // 添加自定义规则
  const addCustomRule = useCallback((rule: ValidationRule) => {
    setActiveRules(prev => [...prev, rule]);
  }, []);

  // 移除规则
  const removeRule = useCallback((ruleId: string) => {
    setActiveRules(prev => prev.filter(r => r.id !== ruleId));
  }, []);

  // 切换规则启用状态
  const toggleRule = useCallback((ruleId: string) => {
    // TODO: 实现规则启用/禁用逻辑
  }, []);

  // 导出验证报告
  const exportValidationReport = useCallback(async () => {
    if (!validationResult) {
      throw new Error('没有验证结果可导出');
    }

    return withLoading('isExporting', async () => {
      // TODO: 实现导出逻辑
      const report = {
        date: new Date().toISOString(),
        result: validationResult,
        rules: activeRules.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          severity: r.severity
        }))
      };

      return report;
    });
  }, [validationResult, activeRules, withLoading]);

  return {
    // 验证功能
    validate: validatePayrolls.mutate,
    validateAsync: validatePayrolls.mutateAsync,
    
    // 修复功能
    autoFix: autoFixIssues.mutate,
    autoFixAsync: autoFixIssues.mutateAsync,
    
    // 规则管理
    rules: activeRules,
    addRule: addCustomRule,
    removeRule,
    toggleRule,
    defaultRules: defaultValidationRules,
    
    // 验证结果
    validationResult,
    clearValidation,
    
    // 导出功能
    exportReport: exportValidationReport,
    
    // 加载状态
    loading: {
      isValidating: loadingState.isValidating || validatePayrolls.isPending,
      isFixing: loadingState.isFixing || autoFixIssues.isPending,
      isExporting: loadingState.isExporting
    },
    
    // 错误状态
    error: validatePayrolls.error || autoFixIssues.error,
    
    // 工具函数
    utils: {
      // 获取问题的严重程度颜色
      getSeverityColor: (severity: ValidationSeverity) => {
        const colors = {
          error: 'error',
          warning: 'warning',
          info: 'info'
        };
        return colors[severity];
      },
      
      // 获取规则类型的描述
      getRuleTypeLabel: (type: ValidationRuleType) => {
        const labels = {
          required_field: '必填字段',
          range_check: '范围检查',
          logical_consistency: '逻辑一致性',
          data_integrity: '数据完整性',
          business_rule: '业务规则'
        };
        return labels[type];
      },
      
      // 判断问题是否可修复
      isFixable: (issueId: string) => {
        const ruleId = issueId.split('-')[1];
        return activeRules.some(r => r.id === ruleId && r.autoFix);
      }
    }
  };
}

// 导出便捷验证函数
export function useQuickValidation() {
  const { validate, validationResult, loading } = usePayrollValidation();

  const validateCurrentMonth = useCallback(async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // 查找当月薪资周期
    const { data: period } = await supabase
      .from('payroll_periods')
      .select('id')
      .eq('period_code', currentMonth)
      .single();

    if (!period) {
      throw new Error('当月薪资周期不存在');
    }

    return validate({ periodId: period.id });
  }, [validate]);

  const validateByDepartment = useCallback((departmentId: string) => {
    return validate({ departmentIds: [departmentId] });
  }, [validate]);

  return {
    validateCurrentMonth,
    validateByDepartment,
    result: validationResult,
    loading
  };
}