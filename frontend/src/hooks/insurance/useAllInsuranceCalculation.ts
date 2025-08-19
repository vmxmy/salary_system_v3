import { useState, useCallback } from 'react';
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
}

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
    includeOccupationalPension = true
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