# Frontend Module Version Analysis

This document categorizes frontend modules into "new" and "old" versions based on file naming conventions (`_new`) and modification dates.

## New Modules

These modules are considered part of the recent refactoring effort.

### Pages

-   `frontend/src/pages/employee/EmployeeEditPage_new.tsx`
-   `frontend/src/pages/employee/EmployeeCreatePage_new.tsx`
-   `frontend/src/pages/employee/EmployeeDetailPage_new.tsx`
-   `frontend/src/pages/TestEmployeePage.tsx`
-   `frontend/src/pages/payroll/PayrollListPage.tsx`
-   `frontend/src/pages/payroll/SalaryComponentFormPage.tsx`
-   `frontend/src/pages/payroll/SalaryComponentListPage.tsx`

### Components

-   `frontend/src/components/employee/JobHistorySection.tsx`
-   `frontend/src/components/employee/JobHistoryForm.tsx`
-   `frontend/src/components/employee/EducationSection.tsx`
-   `frontend/src/components/employee/EducationForm.tsx`
-   `frontend/src/components/employee/EmployeeForm_new.tsx`
-   `frontend/src/components/common/BulkActionsBar.tsx`
-   `frontend/src/components/common/ConfigActionToolbar.tsx`
-   `frontend/src/components/common/ConfigFormModal.tsx`
-   `frontend/src/components/common/ConfigSearchFilter.tsx`
-   `frontend/src/components/common/ConfigurationForm.tsx`
-   `frontend/src/components/common/ConfigurationLayout.tsx`
-   `frontend/src/components/common/ConfigurationTable.tsx`

### Types

-   `frontend/src/types/employee_new.ts`

### Hooks

-   `frontend/src/hooks/useEmployee_new.ts`
-   `frontend/src/hooks/usePayroll.ts`

### API (lib)

-   `frontend/src/lib/employeeApi_new.ts`
-   `frontend/src/lib/payrollApi.ts`

---

## Old Modules

These modules are considered legacy and may be candidates for future refactoring or removal.

### Pages

-   `frontend/src/pages/employee/EmployeeCreatePage.tsx`
-   `frontend/src/pages/employee/EmployeeDetailPage.tsx`
-   `frontend/src/pages/employee/EmployeeEditPage.tsx`
-   `frontend/src/pages/employee/EmployeeListPage.tsx`
-   `frontend/src/pages/payroll/InsuranceConfigPage.tsx`
-   `frontend/src/pages/payroll/TaxConfigPage.tsx`
-   `frontend/src/pages/DesignSystemDemo.tsx`
-   `frontend/src/pages/HomePage.tsx`
-   `frontend/src/pages/LoginPage.tsx`
-   `frontend/src/pages/RegisterPage.tsx`

### Components

-   `frontend/src/components/employee/EmployeeForm.tsx`
-   `frontend/src/components/payroll/BaseConfigCard.tsx`
-   `frontend/src/components/payroll/ComponentCard.tsx`
-   `frontend/src/components/payroll/ComponentModal.tsx`
-   `frontend/src/components/payroll/FilterSidebar.tsx`
-   `frontend/src/components/payroll/InsuranceConfigForm.tsx`
-   `frontend/src/components/payroll/RateConfigCard.tsx`
-   `frontend/src/components/payroll/TaxConfigForm.tsx`
-   `frontend/src/components/layout/AppLayout.tsx`
-   `frontend/src/components/ui/Button.tsx`
-   `frontend/src/components/ui/Checkbox.tsx`
-   `frontend/src/components/ui/DataTable.tsx`
-   `frontend/src/components/ui/DatePicker.tsx`
-   `frontend/src/components/ui/Input.tsx`
-   `frontend/src/components/ui/Radio.tsx`
-   `frontend/src/components/ui/Select.tsx`
-   `frontend/src/components/ui/Textarea.tsx`

### Types

-   `frontend/src/types/employee.ts`
-   `frontend/src/types/payrollComponent.ts`

### Hooks

-   `frontend/src/hooks/useEmployee.ts`
-   `frontend/src/hooks/useEmployees.ts`
-   `frontend/src/hooks/useInsuranceConfigs.ts`
-   `frontend/src/hooks/usePayrollComponents.ts`
-   `frontend/src/hooks/useTaxConfigs.ts`

### API (lib)

-   `frontend/src/lib/employeeApi.ts`
-   `frontend/src/lib/insuranceConfigApi.ts`
-   `frontend/src/lib/payrollComponentApi.ts`
-   `frontend/src/lib/taxConfigApi.ts`
