import { useState } from 'react';
import { ValidationStep } from '@/components/payroll/wizard/ValidationStep';

// 模拟向导状态用于测试
const mockWizardState = {
  mode: 'copy' as const,
  payrollPeriod: '2025-02',
  payDate: '2025-02-28',
  sourceData: {
    sourceMonth: '2025-01',
    totalRecords: 682,
    baseStrategy: 'copy',
    selectedCategories: ['basic_salary', 'allowances', 'deductions'],
    selectedEmployeeIds: null, // null表示选择所有员工
    statistics: {
      totalGrossPay: 50000
    }
  },
  selectedEmployees: []
};

export default function ValidationTestPage() {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [validationComplete, setValidationComplete] = useState(false);

  const handleValidationComplete = (employees: string[]) => {
    setSelectedEmployees(employees);
    setValidationComplete(true);
    console.log('验证完成，选中员工:', employees);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-base-content mb-2">
          数据验证功能测试
        </h1>
        <p className="text-base-content/60">
          测试真实数据验证组件的功能，验证2025-01月数据
        </p>
      </div>

      {/* 测试状态显示 */}
      <div className="mb-6 p-4 bg-info/10 border border-info/20 rounded-lg">
        <h3 className="font-medium text-info mb-2">测试配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-base-content/60">源月份：</span>
            <span className="font-mono">{mockWizardState.sourceData.sourceMonth}</span>
          </div>
          <div>
            <span className="text-base-content/60">目标周期：</span>
            <span className="font-mono">{mockWizardState.payrollPeriod}</span>
          </div>
          <div>
            <span className="text-base-content/60">创建模式：</span>
            <span className="font-mono">{mockWizardState.mode}</span>
          </div>
        </div>
      </div>

      {/* 验证结果状态 */}
      {validationComplete && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
          <h3 className="font-medium text-success mb-2">验证结果</h3>
          <p className="text-sm text-base-content/70">
            已选择 <span className="font-bold text-success">{selectedEmployees.length}</span> 名员工进行薪资周期创建
          </p>
        </div>
      )}

      {/* ValidationStep组件 */}
      <ValidationStep
        wizardState={mockWizardState}
        onValidationComplete={handleValidationComplete}
      />

      {/* 调试信息 */}
      <div className="mt-8 p-4 bg-base-200 rounded-lg">
        <h3 className="font-medium text-base-content mb-2">调试信息</h3>
        <div className="text-xs font-mono text-base-content/60 space-y-1">
          <div>验证状态: {validationComplete ? '已完成' : '进行中'}</div>
          <div>选中员工数: {selectedEmployees.length}</div>
          <div>选中员工ID: {selectedEmployees.slice(0, 3).join(', ')}{selectedEmployees.length > 3 ? '...' : ''}</div>
        </div>
      </div>
    </div>
  );
}