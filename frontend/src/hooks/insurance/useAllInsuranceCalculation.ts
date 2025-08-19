import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useInsuranceCore } from './core/useInsuranceCore';
import { INSURANCE_TYPE_CONFIGS } from './core/insuranceDataService';
import type { CalculationResult } from './core/insuranceCalculator';

export interface InsuranceCalculationDetail extends CalculationResult {}

export interface AllInsuranceResult {
  success: boolean;
  totalEmployeeAmount: number;
  totalEmployerAmount: number;
  details: {
    pension: {
      employee: InsuranceCalculationDetail | null;
      employer: InsuranceCalculationDetail | null;
    };
    medical: {
      employee: InsuranceCalculationDetail | null;
      employer: InsuranceCalculationDetail | null;
    };
    unemployment: {
      employee: InsuranceCalculationDetail | null;
      employer: InsuranceCalculationDetail | null;
    };
    workInjury: {
      employee: InsuranceCalculationDetail | null;
      employer: InsuranceCalculationDetail | null;
    };
    housingFund: {
      employee: InsuranceCalculationDetail | null;
      employer: InsuranceCalculationDetail | null;
    };
    occupationalPension: {
      employee: InsuranceCalculationDetail | null;
      employer: InsuranceCalculationDetail | null;
    };
  };
  errors: string[];
}

interface AllInsuranceParams {
  employeeId: string;
  periodId: string;
  includeOccupationalPension?: boolean;
  saveToDatabase?: boolean; // 新增：是否将计算结果保存到数据库
}

// 获取标准组件名称 - 使用数据库中的标准格式
const getStandardComponentName = (insuranceKey: string, isEmployer: boolean): string | null => {
  const config = INSURANCE_TYPE_CONFIGS.find(c => c.key === insuranceKey);
  if (!config) return null;
  
  // 优先使用从数据库加载的标准名称
  if (isEmployer) {
    return config.standardNameEmployer || `${config.name}单位应缴费额`;
  }
  return config.standardNameEmployee || `${config.name}个人应缴费额`;
};

// 获取标准组件ID - 直接使用数据库中的组件ID
const getStandardComponentId = (insuranceKey: string, isEmployer: boolean): string | null => {
  const config = INSURANCE_TYPE_CONFIGS.find(c => c.key === insuranceKey);
  if (!config) return null;
  
  return isEmployer ? config.componentIdEmployer || null : config.componentIdEmployee || null;
};

/**
 * 综合保险计算 Hook
 * 基于核心组件重构，大幅减少代码量
 */
export const useAllInsuranceCalculation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getInsuranceData, calculateSingleInsurance, InsuranceCalculator } = useInsuranceCore();

  const calculateAllInsurance = useCallback(async ({
    employeeId,
    periodId,
    includeOccupationalPension = true,
    saveToDatabase = false
  }: AllInsuranceParams): Promise<AllInsuranceResult> => {
    setLoading(true);
    setError(null);

    const result: AllInsuranceResult = {
      success: true,
      totalEmployeeAmount: 0,
      totalEmployerAmount: 0,
      details: {
        pension: { employee: null, employer: null },
        medical: { employee: null, employer: null },
        unemployment: { employee: null, employer: null },
        workInjury: { employee: null, employer: null },
        housingFund: { employee: null, employer: null },
        occupationalPension: { employee: null, employer: null }
      },
      errors: []
    };

    try {
      // 获取基础数据（只需要一次查询）
      const baseData = await getInsuranceData(employeeId, periodId);
      
      if (!baseData) {
        throw new Error('Failed to fetch insurance data');
      }

      // 决定要计算的保险类型
      const typesToCalculate = includeOccupationalPension 
        ? INSURANCE_TYPE_CONFIGS 
        : INSURANCE_TYPE_CONFIGS.filter(t => t.key !== 'occupational_pension');

      // 计算每种保险
      const calculations: CalculationResult[] = [];
      
      for (const typeConfig of typesToCalculate) {
        // 计算个人部分
        if (typeConfig.hasEmployee) {
          const employeeResult = calculateSingleInsurance(
            baseData,
            employeeId,
            periodId,
            typeConfig.key,
            false
          );
          
          if (employeeResult.success) {
            calculations.push(employeeResult);
            result.totalEmployeeAmount += employeeResult.amount;
          } else if (employeeResult.errorMessage) {
            result.errors.push(employeeResult.errorMessage);
          }

          // 设置结果
          const detailKey = typeConfig.key === 'work_injury' ? 'workInjury' : 
                           typeConfig.key === 'housing_fund' ? 'housingFund' :
                           typeConfig.key === 'occupational_pension' ? 'occupationalPension' :
                           typeConfig.key as keyof typeof result.details;

          if (detailKey in result.details) {
            result.details[detailKey as keyof typeof result.details].employee = employeeResult;
          }
        }

        // 计算单位部分
        if (typeConfig.hasEmployer) {
          const employerResult = calculateSingleInsurance(
            baseData,
            employeeId,
            periodId,
            typeConfig.key,
            true
          );
          
          if (employerResult.success) {
            calculations.push(employerResult);
            result.totalEmployerAmount += employerResult.amount;
          } else if (employerResult.errorMessage) {
            result.errors.push(employerResult.errorMessage);
          }

          // 设置结果
          const detailKey = typeConfig.key === 'work_injury' ? 'workInjury' : 
                           typeConfig.key === 'housing_fund' ? 'housingFund' :
                           typeConfig.key === 'occupational_pension' ? 'occupationalPension' :
                           typeConfig.key as keyof typeof result.details;

          if (detailKey in result.details) {
            result.details[detailKey as keyof typeof result.details].employer = employerResult;
          }
        }
      }

      // 如果有错误，标记为部分成功
      if (result.errors.length > 0) {
        result.success = false;
      }

      // 如果选择写入数据库且计算成功
      if (saveToDatabase && result.success) {
        try {
          // 获取该员工在该期间的薪资记录ID
          const { data: payrollData, error: payrollError } = await supabase
            .from('payrolls')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('period_id', periodId)
            .single();

          if (payrollError || !payrollData) {
            result.errors.push(`未找到员工薪资记录: ${payrollError?.message || 'No payroll found'}`);
            result.success = false;
            return result;
          }

          const payrollId = payrollData.id;
          const payrollItems: any[] = [];

          // 处理每种保险类型的写入
          for (const typeConfig of typesToCalculate) {
            // 处理个人部分
            if (typeConfig.hasEmployee) {
              const detailKey = typeConfig.key === 'work_injury' ? 'workInjury' : 
                               typeConfig.key === 'housing_fund' ? 'housingFund' :
                               typeConfig.key === 'occupational_pension' ? 'occupationalPension' :
                               typeConfig.key as keyof typeof result.details;

              const employeeDetail = result.details[detailKey as keyof typeof result.details]?.employee;
              
              if (employeeDetail && employeeDetail.success && employeeDetail.amount > 0) {
                const componentId = getStandardComponentId(typeConfig.key, false);
                const componentName = getStandardComponentName(typeConfig.key, false);
                
                if (componentId && componentName) {
                  payrollItems.push({
                    payroll_id: payrollId,
                    component_id: componentId,
                    amount: employeeDetail.amount,
                    notes: `自动计算 - ${componentName}`,
                    period_id: periodId
                  });
                }
              }
            }

            // 处理单位部分
            if (typeConfig.hasEmployer) {
              const detailKey = typeConfig.key === 'work_injury' ? 'workInjury' : 
                               typeConfig.key === 'housing_fund' ? 'housingFund' :
                               typeConfig.key === 'occupational_pension' ? 'occupationalPension' :
                               typeConfig.key as keyof typeof result.details;

              const employerDetail = result.details[detailKey as keyof typeof result.details]?.employer;
              
              if (employerDetail && employerDetail.success && employerDetail.amount > 0) {
                const componentId = getStandardComponentId(typeConfig.key, true);
                const componentName = getStandardComponentName(typeConfig.key, true);
                
                if (componentId && componentName) {
                  payrollItems.push({
                    payroll_id: payrollId,
                    component_id: componentId,
                    amount: employerDetail.amount,
                    notes: `自动计算 - ${componentName}`,
                    period_id: periodId
                  });
                }
              }
            }
          }

          // 批量插入到数据库
          if (payrollItems.length > 0) {
            const { error: insertError } = await supabase
              .from('payroll_items')
              .upsert(payrollItems, {
                onConflict: 'payroll_id,component_id'
              });

            if (insertError) {
              result.errors.push(`数据库写入失败: ${insertError.message}`);
              result.success = false;
            } else {
              result.errors.push(`成功写入 ${payrollItems.length} 条保险记录到数据库`);
            }
          } else {
            result.errors.push('没有有效的保险数据需要写入数据库');
          }

        } catch (writeError) {
          const errorMessage = writeError instanceof Error ? writeError.message : 'Database write failed';
          result.errors.push(`数据库写入异常: ${errorMessage}`);
          result.success = false;
        }
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      result.success = false;
      result.errors.push(errorMessage);
      return result;
    } finally {
      setLoading(false);
    }
  }, [getInsuranceData, calculateSingleInsurance]);

  return {
    calculateAllInsurance,
    loading,
    error
  };
};