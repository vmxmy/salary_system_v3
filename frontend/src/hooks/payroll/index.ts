/**
 * Payroll Hooks 统一导出文件
 * 
 * 该模块提供了完整的薪资管理功能，包括：
 * - 薪资核心管理 (CRUD, 状态管理)
 * - 薪资计算 (预览、批量计算、公式管理)
 * - 导入导出 (Excel处理、模板管理)
 * - 审批流程 (状态流转、批量审批)
 * - 统计分析 (趋势分析、部门统计、成本分析)
 * - 周期管理 (薪资周期、状态控制)
 * - 工作流 (多步骤薪资创建流程)
 */

// 内部导入 - 用于 usePayrollManagement
import { usePayroll as usePayrollHook } from './usePayroll';
// import { usePayrollCalculation as useCalculationHook } from './usePayrollCalculation'; // 已删除
import { usePayrollImportExport as useImportExportHook } from './import-export';
import { usePayrollApproval as useApprovalHook } from './usePayrollApproval';
import { usePayrollAnalytics as useAnalyticsHook } from './usePayrollAnalytics';

// 核心薪资管理
export {
  usePayroll,
  usePayrolls,
  usePayrollDetails,
  useLatestPayrollPeriod,
  usePayrollStatisticsByParams,
  useCostAnalysis,
  useCreatePayroll,
  useCreateBatchPayrolls,
  useUpdatePayrollStatus,
  useUpdateBatchPayrollStatus,
  useDeletePayroll,
  useEmployeeInsuranceDetails,
  useEmployeeMonthlyContributionBases,
  useEmployeeContributionBases,
  payrollFormatters,
  PayrollStatus,
  payrollQueryKeys,
  type PayrollStatusType,
  type PayrollFilters,
  type PayrollSummary,
  type PayrollDetail,
  type BatchOperationResult
} from './usePayroll';

// 薪资详情相关
export {
  usePayrollDetail,
  type PayrollDetailData
} from './usePayrollDetail';

export {
  usePayrollTaxItems,
  type TaxItem
} from './usePayrollTaxItems';

// 薪资相关工具和数据管理
export { 
  useAvailablePayrollMonths, 
  checkMonthAvailability,
  type AvailablePayrollMonth 
} from './useAvailablePayrollMonths';
export { useExcelTemplate } from './useExcelTemplate';
export { 
  useCurrentBases,
  useInsuranceTypes,
  useUpdateEmployeeBase,
  useBatchUpdateEmployeeBases,
  BaseStrategy,
  type BaseStrategyType,
  type BaseAdjustmentConfig,
  type EmployeeBaseData
} from './useInsuranceBases';

// 薪资计算 - 已删除，功能迁移到 Supabase 存储函数
// export {
//   usePayrollCalculation,
//   calculationQueryKeys,
//   type CalculationResult,
//   type PreviewCalculationParams,
//   type BatchCalculationParams,
//   type CalculationProgress
// } from './usePayrollCalculation';

// 导入导出
export {
  usePayrollImportExport,
  importExportQueryKeys,
  type ImportConfig,
  type ImportResult,
  type ExportConfig,
  type ImportProgress,
  type ExcelDataRow,
  type FieldMappingAnalysis,
  type ColumnMatchResult
} from './import-export';

// 审批流程 - 轻量级单级审批
export {
  usePayrollApproval,
  type PayrollApprovalSummary,
  type ApprovalLog,
  type BatchResult,
  type ApprovalParams,
  type RejectParams
} from './usePayrollApproval';

// 统计分析
export {
  usePayrollAnalytics,
  analyticsQueryKeys,
  type PayrollStatistics,
  type DepartmentStatistics,
  type PayrollTrend,
  type ComponentAnalysis,
  type ComparisonParams,
  type ComparisonResult,
  type ReportConfig
} from './usePayrollAnalytics';

// 薪资周期管理
export * from './usePayrollPeriod';
export * from './usePayrollWorkflow';

// 其他专门的 Hooks
export * from './usePayrollEarnings';
export * from './useContributionBase';
export * from './useEmployeeCategory';
export * from './useEmployeePosition';

// 保险配置
export * from './useInsuranceConfig';

// 薪资组件
export * from './useSalaryComponents';

// 薪资统计
export * from './usePayrollStatistics';

// 薪资清除
export * from './useClearPayrollPeriod';

// 薪资日志记录
export {
  usePayrollLogger,
  type LogAction,
  type LogParams,
  type BatchLogParams
} from './usePayrollLogger';

// 批量查询优化 - 性能提升
export {
  useBatchPayrollDetails,
  useBatchPayrollSummary,
  useBatchEmployeeInsurance,
  useBatchEmployeeInfo,
  useBatchPayrollComplete,
  useSmartBatchPayroll,
  batchPayrollQueryKeys,
  BATCH_QUERY_CONFIGS
} from './useBatchPayrollQueries';

// 批量操作管理
export { useBatchOperationsManager } from './useBatchOperationsManager';

// 薪资数据处理
export { usePayrollDataProcessor } from './usePayrollDataProcessor';

// 批量验证
export { usePayrollBatchValidation } from './usePayrollBatchValidation';

// 模态框管理
export { usePayrollModalManager } from './usePayrollModalManager';

/**
 * 便捷的组合 Hook
 * 提供统一的薪资管理接口
 */
export function usePayrollManagement(periodId?: string) {
  const payroll = usePayrollHook({ filters: { periodId } });
  // const calculation = useCalculationHook(); // 已删除，功能迁移到 Supabase
  const importExport = useImportExportHook();
  const approval = useApprovalHook();
  const analytics = useAnalyticsHook();
  
  return {
    // 数据
    payrolls: payroll.payrolls,
    
    // 加载状态
    loading: {
      payrolls: payroll.loading.isLoading,
      // calculation: calculation.loading.batch, // 已删除
      import: importExport.isImporting,
      export: importExport.isExporting,
      approval: approval.loading.isProcessing
    },
    
    // 操作
    actions: {
      // 薪资管理
      createPayroll: payroll.mutations.createPayroll.mutate,
      deletePayroll: payroll.mutations.deletePayroll.mutate,
      
      // 计算功能已迁移到 Supabase 存储函数
      // calculate: calculation.actions.batchCalculate,
      // preview: calculation.actions.preview,
      
      // 导入导出
      importExcel: importExport.importExcel.mutate,
      exportExcel: importExport.exportExcel.mutate,
      
      // 审批
      approve: approval.actions.approve,
      reject: approval.actions.reject,
      markAsPaid: approval.actions.markPaid
    },
    
    // 分析
    analytics: {
      statistics: analytics.queries.usePayrollStatistics,
      departments: analytics.queries.useDepartmentStatistics,
      trends: analytics.queries.usePayrollTrends
    }
  };
}