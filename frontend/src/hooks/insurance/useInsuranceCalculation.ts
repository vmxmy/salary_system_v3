import { useState, useCallback } from 'react';
import { useInsuranceCore } from './core/useInsuranceCore';
import type { CalculationResult } from './core/insuranceCalculator';

export type InsuranceCalculationResult = CalculationResult

export interface InsuranceCalculationParams {
  employeeId: string;
  periodId: string;
  insuranceTypeKey: string;
  isEmployer?: boolean;
}

/**
 * 单个保险计算 Hook
 * 基于核心组件重构，减少重复代码
 */
export const useInsuranceCalculation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getInsuranceData, calculateSingleInsurance } = useInsuranceCore();

  const calculateInsurance = useCallback(async ({
    employeeId,
    periodId,
    insuranceTypeKey,
    isEmployer = false
  }: InsuranceCalculationParams): Promise<InsuranceCalculationResult> => {
    setLoading(true);
    setError(null);

    try {
      // 获取基础数据
      const baseData = await getInsuranceData(employeeId, periodId);
      
      if (!baseData) {
        throw new Error('Failed to fetch insurance data');
      }

      // 计算保险
      const result = calculateSingleInsurance(
        baseData,
        employeeId,
        periodId,
        insuranceTypeKey,
        isEmployer
      );

      if (!result.success && result.errorMessage) {
        setError(result.errorMessage);
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        amount: 0,
        details: null,
        errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [getInsuranceData, calculateSingleInsurance]);

  return {
    calculateInsurance,
    loading,
    error
  };
};