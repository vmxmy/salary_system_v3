import { useState, useCallback } from 'react';
import { InsuranceDataService } from './insuranceDataService';
import type { InsuranceBaseData } from './insuranceDataService';
import { InsuranceCalculator } from './insuranceCalculator';
import type { CalculationResult } from './insuranceCalculator';

/**
 * 核心保险计算 Hook - 提供基础功能供其他 hooks 复用
 */
export const useInsuranceCore = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedData, setCachedData] = useState<Map<string, InsuranceBaseData>>(new Map());

  /**
   * 获取保险基础数据（带缓存）
   */
  const getInsuranceData = useCallback(async (
    employeeId: string,
    periodId: string,
    forceRefresh = false
  ): Promise<InsuranceBaseData | null> => {
    const cacheKey = `${employeeId}-${periodId}`;
    
    // 检查缓存
    if (!forceRefresh && cachedData.has(cacheKey)) {
      return cachedData.get(cacheKey)!;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await InsuranceDataService.fetchEmployeeInsuranceData(employeeId, periodId);
      
      // 更新缓存
      setCachedData(prev => new Map(prev).set(cacheKey, data));
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch insurance data';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [cachedData]);

  /**
   * 计算单个保险项目
   */
  const calculateSingleInsurance = useCallback((
    baseData: InsuranceBaseData,
    employeeId: string,
    periodId: string,
    insuranceTypeKey: string,
    isEmployer: boolean
  ): CalculationResult => {
    const insuranceType = baseData.insuranceTypes.get(insuranceTypeKey);
    
    if (!insuranceType) {
      return {
        success: false,
        amount: 0,
        details: null,
        errorMessage: `Insurance type not found: ${insuranceTypeKey}`
      };
    }

    const rule = baseData.insuranceRules.get(insuranceType.id);
    
    if (!rule) {
      return {
        success: false,
        amount: 0,
        details: null,
        errorMessage: `No rule configured for ${insuranceType.name}`
      };
    }

    const contributionBase = baseData.contributionBases.get(insuranceType.id) || 0;
    const rate = isEmployer ? rule.employer_rate : rule.employee_rate;

    return InsuranceCalculator.calculate({
      employeeId,
      periodId,
      insuranceType: insuranceTypeKey,
      insuranceTypeName: insuranceType.name,
      employeeCategory: baseData.employeeCategoryName,
      contributionBase,
      rate,
      baseFloor: rule.base_floor,
      baseCeiling: rule.base_ceiling,
      isEmployer,
      isApplicable: rule.is_applicable
    });
  }, []);

  /**
   * 清除缓存
   */
  const clearCache = useCallback(() => {
    setCachedData(new Map());
  }, []);

  return {
    loading,
    error,
    getInsuranceData,
    calculateSingleInsurance,
    clearCache,
    InsuranceCalculator,
    InsuranceDataService
  };
};