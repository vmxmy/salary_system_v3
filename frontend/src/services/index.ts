// Export all services
export { BaseService } from './base.service';
export { PayrollCreationService } from './payroll-creation.service';

// Export unified auth
export { auth } from '@/lib/auth';

// Export types
export type { AuthUser } from '@/lib/auth';
export type { QueryOptions } from './base.service';
export type { 
  PayrollValidation,
  PayrollBatchResult,
  PayrollBatchSummary,
  PayrollPeriodSummary,
  PayrollClearResult,
  PayrollClearSummary
} from './payroll-creation.service';

// Department functionality has been migrated to hooks
// Use @/hooks/department/useDepartments instead