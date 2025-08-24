// 核心组件导出
export { useInsuranceCore } from './core/useInsuranceCore';
export { InsuranceDataService } from './core/insuranceDataService';
export { InsuranceCalculator } from './core/insuranceCalculator';
export type { CalculationResult } from './core/insuranceCalculator';
export type { InsuranceBaseData, InsuranceTypeConfig } from './core/insuranceDataService';

// 业务 hooks 导出
export { useInsuranceCalculation } from './useInsuranceCalculation';
export type { InsuranceCalculationResult, InsuranceCalculationParams } from './useInsuranceCalculation';

// useAllInsuranceCalculation has been removed - use useBatchInsuranceCalculation instead

export { useBatchInsuranceCalculation } from './useBatchInsuranceCalculation';
export type { BatchInsuranceResult } from './useBatchInsuranceCalculation';

// 配置管理 hooks 导出
export { useInsuranceRuleConfig } from './useInsuranceConfig';
// 类型从统一的类型文件导出
export type { 
  InsuranceTypeInfo, 
  EmployeeCategory, 
  InsuranceRuleConfig, 
  BatchConfigParams 
} from '@/types/insurance';