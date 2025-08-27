import { PayrollPivotTable } from './PayrollPivotTable';
import type { BasePayrollData } from './PayrollTableContainer';

interface PayrollDetailContainerProps {
  data: BasePayrollData[];
  loading?: boolean;
}

export function PayrollDetailContainer({ data, loading }: PayrollDetailContainerProps) {
  return (
    <PayrollPivotTable
      data={data}
      loading={loading}
      showColumnToggle={false}
    />
  );
}