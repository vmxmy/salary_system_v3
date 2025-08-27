/**
 * 薪资组件管理 Hook 导出
 */

export {
  useSalaryComponents,
  useSalaryComponent,
  useSalaryComponentStats,
  useCreateSalaryComponent,
  useUpdateSalaryComponent,
  useDeleteSalaryComponent,
  useBatchDeleteSalaryComponents,
  SALARY_COMPONENT_KEYS,
} from './useSalaryComponents';

export type {
  SalaryComponent,
  CreateSalaryComponentRequest,
  UpdateSalaryComponentRequest,
  SalaryComponentQuery,
  SalaryComponentStats,
  ComponentType,
  ComponentCategory,
  CopyStrategy,
  StabilityLevel,
} from '@/types/salary-component';

export {
  COMPONENT_TYPE_CONFIG,
  COMPONENT_CATEGORY_CONFIG,
  COPY_STRATEGY_CONFIG,
  STABILITY_LEVEL_CONFIG,
} from '@/types/salary-component';