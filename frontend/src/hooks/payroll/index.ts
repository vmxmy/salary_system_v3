/**
 * Payroll Hooks
 * 薪资管理相关的 React Hooks
 */

// 导出主Hook和类型
export {
  usePayroll,
  PayrollStatus,
  type PayrollStatusType,
  payrollQueryKeys,
  payrollFormatters,
} from './usePayroll';

// 导出独立的查询Hooks
export {
  usePayrolls,
  usePayrollDetails,
  useLatestPayrollMonth,
  usePayrollStatisticsByParams,
  useCostAnalysis,
  useEmployeeInsuranceDetails,
  useEmployeeMonthlyContributionBases,
  useEmployeeContributionBases,
  useInsuranceTypes,
} from './usePayroll';

// 导出Mutation Hooks
export {
  useCreatePayroll,
  useCreateBatchPayrolls,
  useUpdatePayrollStatus,
  useUpdateBatchPayrollStatus,
  useCalculatePayrolls,
  useDeletePayroll,
} from './usePayroll';

// 保险配置
export * from './useInsuranceConfig';

// 薪资组件
export * from './useSalaryComponents';

// 薪资统计
export * from './usePayrollStatistics';