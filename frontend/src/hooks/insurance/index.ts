// 核心组件导出
export { useInsuranceCore } from './core/useInsuranceCore';
export { InsuranceDataService } from './core/insuranceDataService';
export { InsuranceCalculator } from './core/insuranceCalculator';
export type { CalculationResult } from './core/insuranceCalculator';
export type { InsuranceBaseData, InsuranceTypeConfig } from './core/insuranceDataService';

// 业务 hooks 导出
export { useInsuranceCalculation } from './useInsuranceCalculation';
export type { InsuranceCalculationResult, InsuranceCalculationParams } from './useInsuranceCalculation';

export { useAllInsuranceCalculation } from './useAllInsuranceCalculation';
export type { AllInsuranceResult, InsuranceCalculationDetail } from './useAllInsuranceCalculation';

export { useBatchInsuranceCalculation } from './useBatchInsuranceCalculation';
export type { BatchInsuranceResult } from './useBatchInsuranceCalculation';