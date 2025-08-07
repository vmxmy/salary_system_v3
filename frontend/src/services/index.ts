// Export all services
export { BaseService } from './base.service';
export { employeeService } from './employee.service';
export { departmentService } from './department.service';
export { PayrollCreationService } from './payroll-creation.service';

// Export unified auth
export { auth } from '@/lib/auth';

// Export types
export type { AuthUser } from '@/lib/auth';
export type { DepartmentNode } from './department.service';
export type { QueryOptions } from './base.service';
export type { 
  PayrollValidation,
  PayrollBatchResult,
  PayrollBatchSummary,
  PayrollPeriodSummary,
  PayrollClearResult,
  PayrollClearSummary
} from './payroll-creation.service';