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
    maternity: {
      employee: InsuranceCalculationDetail | null;
      employer: InsuranceCalculationDetail | null;
    };
    housingFund: {
      employee: InsuranceCalculationDetail | null;
      employer: InsuranceCalculationDetail | null;
    };
    seriousIllness: {
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

// 将保险类型key映射到结果详情的属性名
const getDetailKey = (insuranceKey: string): keyof AllInsuranceResult['details'] => {
  const keyMap: Record<string, keyof AllInsuranceResult['details']> = {
    'pension': 'pension',
    'medical': 'medical', 
    'unemployment': 'unemployment',
    'work_injury': 'workInjury',
    'maternity': 'maternity',
    'housing_fund': 'housingFund',
    'serious_illness': 'seriousIllness',
    'occupational_pension': 'occupationalPension'
  };
  
  return keyMap[insuranceKey] || 'pension'; // 默认返回pension作为fallback
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
        maternity: { employee: null, employer: null },
        housingFund: { employee: null, employer: null },
        seriousIllness: { employee: null, employer: null },
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
        // 🔍 调试日志：大病医疗计算追踪
        if (typeConfig.key === 'serious_illness') {
          console.log('🏥 [大病医疗] 开始计算:', {
            employeeId,
            periodId,
            hasEmployee: typeConfig.hasEmployee,
            hasEmployer: typeConfig.hasEmployer,
            baseData: baseData
          });
        }

        // 计算个人部分
        if (typeConfig.hasEmployee) {
          const employeeResult = calculateSingleInsurance(
            baseData,
            employeeId,
            periodId,
            typeConfig.key,
            false
          );
          
          // 🔍 大病医疗个人部分结果
          if (typeConfig.key === 'serious_illness') {
            console.log('🏥 [大病医疗-个人] 计算结果:', employeeResult);
          }
          
          if (employeeResult.success) {
            calculations.push(employeeResult);
            result.totalEmployeeAmount += employeeResult.amount;
          } else if (employeeResult.errorMessage) {
            result.errors.push(employeeResult.errorMessage);
          }

          // 设置结果
          const detailKey = getDetailKey(typeConfig.key);
          result.details[detailKey].employee = employeeResult;
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
          
          // 🔍 大病医疗单位部分结果
          if (typeConfig.key === 'serious_illness') {
            console.log('🏥 [大病医疗-单位] 计算结果:', employerResult);
          }
          
          if (employerResult.success) {
            calculations.push(employerResult);
            result.totalEmployerAmount += employerResult.amount;
          } else if (employerResult.errorMessage) {
            result.errors.push(employerResult.errorMessage);
          }

          // 设置结果
          const detailKey = getDetailKey(typeConfig.key);
          result.details[detailKey].employer = employerResult;
        }
      }

      // 如果有错误，标记为部分成功
      if (result.errors.length > 0) {
        result.success = false;
      }

      // 🔍 调试：检查saveToDatabase参数
      console.log('💾 [数据库写入] 参数检查:', {
        saveToDatabase: saveToDatabase,
        resultSuccess: result.success,
        willWriteToDatabase: saveToDatabase && result.success
      });

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
            // 🔍 大病医疗写入条件检查
            if (typeConfig.key === 'serious_illness') {
              console.log('🏥 [大病医疗-写入检查] 开始检查写入条件:', {
                hasEmployee: typeConfig.hasEmployee,
                hasEmployer: typeConfig.hasEmployer
              });
            }

            // 处理个人部分
            if (typeConfig.hasEmployee) {
              const detailKey = getDetailKey(typeConfig.key);
              const employeeDetail = result.details[detailKey]?.employee;
              
              // 🔍 大病医疗个人部分写入检查
              if (typeConfig.key === 'serious_illness') {
                console.log('🏥 [大病医疗-个人写入] 检查条件:', {
                  employeeDetail: employeeDetail,
                  success: employeeDetail?.success,
                  amount: employeeDetail?.amount,
                  条件检查: employeeDetail && employeeDetail.success && employeeDetail.amount >= 0
                });
              }
              
              if (employeeDetail && employeeDetail.success && employeeDetail.amount >= 0) {
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
                  
                  if (typeConfig.key === 'serious_illness') {
                    console.log('🏥 [大病医疗-个人] ✅ 已添加到写入队列');
                  }
                }
              } else if (typeConfig.key === 'serious_illness') {
                console.log('🏥 [大病医疗-个人] ❌ 未满足写入条件');
              }
            }

            // 处理单位部分
            if (typeConfig.hasEmployer) {
              const detailKey = getDetailKey(typeConfig.key);
              const employerDetail = result.details[detailKey]?.employer;
              
              // 🔍 大病医疗单位部分写入检查
              if (typeConfig.key === 'serious_illness') {
                console.log('🏥 [大病医疗-单位写入] 检查条件:', {
                  employerDetail: employerDetail,
                  success: employerDetail?.success,
                  amount: employerDetail?.amount,
                  条件检查: employerDetail && employerDetail.success && employerDetail.amount >= 0
                });
              }
              
              if (employerDetail && employerDetail.success && employerDetail.amount >= 0) {
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
                  
                  if (typeConfig.key === 'serious_illness') {
                    console.log('🏥 [大病医疗-单位] ✅ 已添加到写入队列, 金额:', employerDetail.amount);
                  }
                }
              } else if (typeConfig.key === 'serious_illness') {
                console.log('🏥 [大病医疗-单位] ❌ 未满足写入条件');
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