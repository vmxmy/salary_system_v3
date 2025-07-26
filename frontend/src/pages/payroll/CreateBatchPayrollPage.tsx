import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useAllEmployees } from '@/hooks/useEmployees';
import { useCreateBatchPayrolls } from '@/hooks/payroll';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { MonthPicker } from '@/components/common/MonthPicker';
import { cn } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { format } from 'date-fns';
import { getMonthDateRange, getCurrentYearMonth } from '@/lib/dateUtils';
import type { ColumnDef } from '@tanstack/react-table';

interface EmployeeData {
  id: string;
  full_name: string;
  id_number: string;
  department_name?: string;
  position_name?: string;
  status: string;
}

export default function CreateBatchPayrollPage() {
  const { t } = useTranslation(['payroll', 'common', 'employee']);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // 状态管理
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // 默认为当前月份
    return getCurrentYearMonth();
  });
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // 获取员工列表
  const { data: employeesData, isLoading } = useAllEmployees();

  // 创建批量薪资
  const createBatchPayrolls = useCreateBatchPayrolls();

  // 过滤员工
  const filteredEmployees = departmentFilter === 'all' 
    ? employeesData?.data || []
    : (employeesData?.data || []).filter(emp => emp.department_name === departmentFilter);

  // 获取部门列表
  const departments = Array.from(
    new Set((employeesData?.data || []).map(emp => emp.department_name).filter(Boolean))
  );

  // 表格列定义
  const columns: ColumnDef<EmployeeData>[] = [
    {
      accessorKey: 'full_name',
      header: t('employee:fullName'),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.full_name}</p>
          <p className="text-xs text-base-content/60">{row.original.id_number}</p>
        </div>
      )
    },
    {
      accessorKey: 'department_name',
      header: t('employee:department'),
      cell: ({ getValue }) => getValue() || '-'
    },
    {
      accessorKey: 'position_name',
      header: t('employee:position'),
      cell: ({ getValue }) => getValue() || '-'
    }
  ];

  // 处理全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees.map(emp => emp.id));
    }
  }, [selectedEmployeeIds, filteredEmployees]);


  // 处理创建
  const handleCreate = async () => {
    if (selectedEmployeeIds.length === 0) {
      showError(t('payroll:selectEmployeesRequired'));
      return;
    }

    if (!selectedMonth || !payDate) {
      showError(t('payroll:fillAllFieldsRequired'));
      return;
    }

    const payPeriod = getMonthDateRange(selectedMonth);

    try {
      await createBatchPayrolls.mutateAsync({
        employeeIds: selectedEmployeeIds,
        payPeriodStart: payPeriod.startDate,
        payPeriodEnd: payPeriod.endDate,
        payDate: payDate
      });
      
      showSuccess(t('payroll:batchCreateSuccess', { count: selectedEmployeeIds.length }));
      navigate('/payroll');
    } catch (error) {
      showError(t('payroll:batchCreateError'));
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title={t('payroll:createBatchPayroll')}
        description={t('payroll:createBatchPayrollDesc')}
      />

      {/* 薪资信息设置 */}
      <div className={cardEffects.modern}>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('payroll:payrollInformation')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 薪资月份 */}
            <div>
              <label className="label">
                <span className="label-text">{t('payroll:payPeriod')}</span>
              </label>
              <MonthPicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                placeholder={t('payroll:selectMonth')}
              />
            </div>

            {/* 支付日期 */}
            <div>
              <label className="label">
                <span className="label-text">{t('payroll:payDate')}</span>
              </label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className={inputEffects.modern}
                min={getMonthDateRange(selectedMonth).startDate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 员工选择 */}
      <div className={cardEffects.modern}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('payroll:selectEmployees')}</h3>
            
            <div className="flex items-center gap-3">
              {/* 部门筛选 */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="select select-bordered select-sm"
              >
                <option value="all">{t('common:allDepartments')}</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              {/* 全选按钮 */}
              <button
                onClick={handleSelectAll}
                className={cn(buttonEffects.secondary, 'btn btn-sm')}
              >
                {selectedEmployeeIds.length === filteredEmployees.length 
                  ? t('common:deselectAll') 
                  : t('common:selectAll')}
              </button>
            </div>
          </div>

          {/* 选中统计 */}
          <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm">
              {t('payroll:selectedEmployeesCount', { count: selectedEmployeeIds.length })}
            </p>
          </div>

          {/* 员工列表 */}
          <DataTable
            columns={columns}
            data={filteredEmployees}
            enableRowSelection
            onRowSelectionChange={(rowSelection) => {
              const selectedRows = Object.keys(rowSelection)
                .filter(key => rowSelection[key])
                .map(index => filteredEmployees[parseInt(index)]?.id)
                .filter(Boolean);
              setSelectedEmployeeIds(selectedRows);
            }}
            showPagination={false}
            showToolbar={false}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => navigate('/payroll')}
          className={cn(buttonEffects.ghost, 'btn')}
        >
          {t('common:cancel')}
        </button>
        <button
          onClick={handleCreate}
          disabled={createBatchPayrolls.isPending || selectedEmployeeIds.length === 0}
          className={cn(buttonEffects.primary, 'btn gap-2')}
        >
          {createBatchPayrolls.isPending && (
            <span className="loading loading-spinner loading-sm"></span>
          )}
          {t('payroll:createPayroll', { count: selectedEmployeeIds.length })}
        </button>
      </div>
    </div>
  );
}