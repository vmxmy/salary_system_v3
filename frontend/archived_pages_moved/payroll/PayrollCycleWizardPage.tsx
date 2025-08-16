import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonthPicker } from '@/components/common/MonthPicker';
import { SalaryComponentCard } from '@/components/common/SalaryComponentCard';
import { PayrollCreationSuccessModal } from '@/components/payroll/PayrollCreationSuccessModal';
import { useTranslation } from '@/hooks/useTranslation';
import { usePayrolls } from '@/hooks/payroll';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { cn } from '@/lib/utils';
import { formatCurrency, formatMonth } from '@/lib/format';
import { getMonthDateRange, getPreviousMonth } from '@/lib/dateUtils';
import { salaryComponentFieldsService, type SalaryComponentCategory, type SalaryFieldStatistic } from '@/_archived_services/services/salary-component-fields.service';
import { ValidationStep } from '@/components/payroll/wizard/ValidationStep';
import { ConfirmationStep as EnhancedConfirmationStep } from '@/components/payroll/wizard/ConfirmationStep';

// 向导步骤枚举
const WizardStep = {
  MODE_SELECTION: 1,
  DATA_SOURCE: 2,
  DATA_CONFIGURATION: 3,
  VALIDATION: 4,
  CONFIRMATION: 5
} as const;

// 创建模式枚举
const CreationMode = {
  COPY: 'copy',
  IMPORT: 'import', 
  MANUAL: 'manual',
  TEMPLATE: 'template'
} as const;

// 源数据接口
interface SourceData {
  type: 'copy' | 'import' | 'manual' | 'template';
  sourceMonth?: string;
  totalRecords?: number;
  payrollData?: PayrollDataItem[];
  statistics?: PayrollStatistics;
  baseStrategy?: 'copy' | 'new';
  selectedCategories?: string[];
  categories?: SalaryComponentCategory[];
  selectedEmployeeIds?: string[];
  importFile?: File;
  templateId?: string;
}

// 薪资数据项接口
interface PayrollDataItem {
  id: string;
  employee_id: string;
  employee?: {
    employee_name?: string;
    id_number?: string | null;
  };
  gross_pay?: number;
  net_pay?: number;
  status?: string;
  payroll_id?: string;
  pay_date?: string;
  pay_period_start?: string;
  pay_period_end?: string;
  employee_name?: string;
  total_deductions?: number;
  department_name?: string;
}

// 薪资统计接口
interface PayrollStatistics {
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  avgSalary: number;
}

// 向导状态接口
interface WizardState {
  currentStep: number;
  mode: string | null;
  payrollPeriod: string;
  payDate: string;
  selectedEmployees: string[];
  sourceData: SourceData | null;
  isDraftSaved: boolean;
  draftId?: string;
}

// 步骤配置
const STEPS = [
  { id: WizardStep.MODE_SELECTION, label: '选择创建方式', icon: '🛠️' },
  { id: WizardStep.DATA_SOURCE, label: '配置数据源', icon: '📂' },
  { id: WizardStep.DATA_CONFIGURATION, label: '数据配置', icon: '⚙️' },
  { id: WizardStep.VALIDATION, label: '数据验证', icon: '🔍' },
  { id: WizardStep.CONFIRMATION, label: '确认创建', icon: '🚀' }
];

export default function PayrollCycleWizardPage() {
  const navigate = useNavigate();

  // 向导状态
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: WizardStep.MODE_SELECTION,
    mode: null,
    payrollPeriod: '',
    payDate: '',
    selectedEmployees: [],
    sourceData: null,
    isDraftSaved: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  
  // 成功模态框状态
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdPeriodId, setCreatedPeriodId] = useState<string | undefined>();

  // Memoize computed values to prevent unnecessary re-renders
  const selectedEmployeesCount = useMemo(() => wizardState.selectedEmployees.length, [wizardState.selectedEmployees]);

  // 检查当前步骤是否可以继续
  useEffect(() => {
    let canProceed = false;
    switch (wizardState.currentStep) {
      case WizardStep.MODE_SELECTION:
        canProceed = wizardState.mode !== null;
        break;
      case WizardStep.DATA_SOURCE:
        canProceed = wizardState.sourceData !== null;
        break;
      case WizardStep.DATA_CONFIGURATION:
        canProceed = wizardState.payrollPeriod !== '' && wizardState.payDate !== '';
        break;
      case WizardStep.VALIDATION:
        canProceed = true; // 验证步骤总是可以继续
        break;
      case WizardStep.CONFIRMATION:
        canProceed = selectedEmployeesCount > 0;
        break;
    }
    setCanProceed(canProceed);
  }, [
    wizardState.currentStep,
    wizardState.mode,
    wizardState.sourceData,
    wizardState.payrollPeriod,
    wizardState.payDate,
    selectedEmployeesCount
  ]);

  // 更新向导状态
  const updateWizardState = useCallback((updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  }, []);

  // 专门为数据源变更创建的回调
  const handleSourceDataChange = useCallback((sourceData: SourceData | null) => {
    updateWizardState({ sourceData });
  }, [updateWizardState]);

  // 专门为模式选择创建的回调
  const handleModeSelect = useCallback((mode: string) => {
    updateWizardState({ mode });
  }, [updateWizardState]);

  // 下一步
  const handleNext = useCallback(() => {
    setWizardState(prev => {
      if (canProceed && prev.currentStep < WizardStep.CONFIRMATION) {
        return { ...prev, currentStep: prev.currentStep + 1 };
      }
      return prev;
    });
  }, [canProceed]);

  // 上一步
  const handlePrevious = useCallback(() => {
    setWizardState(prev => {
      if (prev.currentStep > WizardStep.MODE_SELECTION) {
        return { ...prev, currentStep: prev.currentStep - 1 };
      }
      return prev;
    });
  }, []);

  // 取消并返回
  const handleCancel = useCallback(() => {
    navigate('/payroll');
  }, [navigate]);

  // 完成创建
  const handleComplete = useCallback(async (result?: { success: boolean; periodId?: string; error?: string }) => {
    try {
      setIsLoading(true);
      
      if (result?.success) {
        // Successfully created payroll period
        setCreatedPeriodId(result.periodId);
        setIsSuccessModalOpen(true);
      } else {
        console.error('薪资周期创建失败:', result?.error);
        alert(`薪资周期创建失败: ${result?.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('处理创建结果异常:', error);
      alert('薪资周期创建失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 处理成功模态框关闭
  const handleSuccessModalClose = useCallback(() => {
    setIsSuccessModalOpen(false);
    setCreatedPeriodId(undefined);
  }, []);

  // 处理查看薪资列表
  const handleViewPayrolls = useCallback(() => {
    navigate('/payroll');
  }, [navigate]);

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (wizardState.currentStep) {
      case WizardStep.MODE_SELECTION:
        return (
          <ModeSelectionStep 
            selectedMode={wizardState.mode}
            onModeSelect={handleModeSelect}
          />
        );
      case WizardStep.DATA_SOURCE:
        return (
          <DataSourceStepInline
            mode={wizardState.mode!}
            sourceData={wizardState.sourceData}
            onSourceDataChange={handleSourceDataChange}
          />
        );
      case WizardStep.DATA_CONFIGURATION:
        return <DataConfigurationStep wizardState={wizardState} updateWizardState={updateWizardState} />;
      case WizardStep.VALIDATION:
        return (
          <ValidationStep 
            wizardState={wizardState}
            onValidationComplete={(selectedEmployees) => {
              // Received selected employees for validation
              updateWizardState({ selectedEmployees });
            }}
          />
        );
      case WizardStep.CONFIRMATION:
        return (
          <ConfirmationStep 
            wizardState={wizardState}
            updateWizardState={updateWizardState}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-base-100">
      {/* 顶部进度条 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-base-content">
              创建薪资周期
            </h1>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleCancel}
            >
              ✕
            </button>
          </div>

          {/* DaisyUI 步骤指示器 */}
          <ul className="steps w-full">
            {STEPS.map((step) => (
              <li key={step.id} className={`step ${
                wizardState.currentStep > step.id 
                  ? "step-success" 
                  : wizardState.currentStep === step.id 
                  ? "step-primary" 
                  : ""
              }`}>
                <span className="step-icon">
                  {wizardState.currentStep > step.id ? '✅' : step.icon}
                </span>
                {step.label}
              </li>
            ))}
          </ul>

          {/* 当前步骤信息 */}
          <div className="mt-4 text-center">
            <p className="text-lg font-medium text-base-content">
              {STEPS.find(s => s.id === wizardState.currentStep)?.label}
            </p>
            <p className="text-sm text-base-content/60">
              步骤 {wizardState.currentStep} / {STEPS.length}
            </p>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {renderStepContent()}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="sticky bottom-0 bg-base-100 border-t border-base-200 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {wizardState.currentStep > WizardStep.MODE_SELECTION && (
                <button
                  className="btn btn-ghost"
                  onClick={handlePrevious}
                >
                  ← 上一步
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                className="btn btn-ghost"
                onClick={handleCancel}
              >
                取消
              </button>

              {wizardState.currentStep < WizardStep.CONFIRMATION && (
                <button
                  className="btn btn-primary"
                  onClick={handleNext}
                  disabled={!canProceed || isLoading}
                >
                  下一步 →
                </button>
              )}
              {/* Note: Confirmation step handles its own button internally */}
            </div>
          </div>
        </div>
      </div>

      {/* 成功创建模态框 */}
      <PayrollCreationSuccessModal
        isOpen={isSuccessModalOpen}
        periodId={createdPeriodId}
        onClose={handleSuccessModalClose}
        onViewPayrolls={handleViewPayrolls}
      />
    </div>
  );
}

// 步骤1：选择创建方式
interface ModeSelectionStepProps {
  selectedMode: string | null;
  onModeSelect: (mode: string) => void;
}

function ModeSelectionStep({ selectedMode, onModeSelect }: ModeSelectionStepProps) {
  const modes = [
    {
      id: CreationMode.COPY,
      icon: '📋',
      title: '复制上月数据',
      description: '基于上个薪资周期的数据快速创建新周期',
      recommended: true,
      features: ['快速创建', '保持一致性', '减少错误']
    },
    {
      id: CreationMode.IMPORT,
      icon: '📁',
      title: 'Excel导入',
      description: '从Excel文件批量导入员工薪资数据',
      features: ['批量导入', '支持Excel', '字段映射']
    },
    {
      id: CreationMode.MANUAL,
      icon: '✏️',
      title: '手动创建',
      description: '逐个添加员工薪资记录，完全手动控制',
      features: ['完全控制', '逐个创建', '精确设置']
    },
    {
      id: CreationMode.TEMPLATE,
      icon: '📄',
      title: '使用模板',
      description: '基于预设的薪资模板快速创建',
      features: ['预设模板', '标准化', '快速应用']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-base-content mb-2">
          选择创建方式
        </h2>
        <p className="text-base-content/60">
          选择最适合的薪资周期创建方式
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modes.map((mode) => (
          <div
            key={mode.id}
            className={`card cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
              selectedMode === mode.id
                ? "bg-primary/5 border-2 border-primary shadow-lg"
                : "bg-base-100 border border-base-200 hover:border-primary/50"
            }`}
            onClick={() => onModeSelect(mode.id)}
          >
            <div className="card-body p-6">
              {mode.recommended && (
                <div className="badge badge-primary badge-sm mb-2">
                  推荐
                </div>
              )}
              
              <div className="flex items-start gap-4">
                <div className="text-4xl">{mode.icon}</div>
                <div className="flex-1">
                  <h3 className="card-title text-lg mb-2">{mode.title}</h3>
                  <p className="text-sm text-base-content/70 mb-4">
                    {mode.description}
                  </p>
                  
                  <div className="space-y-1">
                    {mode.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <svg className="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-base-content/60">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 步骤2：数据源配置内联组件
interface DataSourceStepInlineProps {
  mode: string;
  sourceData: SourceData | null;
  onSourceDataChange: (sourceData: SourceData | null) => void;
}

function DataSourceStepInline({ mode, sourceData, onSourceDataChange }: DataSourceStepInlineProps) {
  switch (mode) {
    case CreationMode.COPY:
      return (
        <CopyModeStepInline 
          sourceData={sourceData}
          onSourceDataChange={onSourceDataChange}
        />
      );
    case CreationMode.IMPORT:
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📁</div>
          <h2 className="text-xl font-bold mb-4">Excel导入</h2>
          <p className="text-base-content/60">从Excel文件导入薪资数据 - 开发中</p>
        </div>
      );
    case CreationMode.MANUAL:
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">✏️</div>
          <h2 className="text-xl font-bold mb-4">手动创建</h2>
          <p className="text-base-content/60">手动创建薪资记录 - 开发中</p>
        </div>
      );
    case CreationMode.TEMPLATE:
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-xl font-bold mb-4">使用模板</h2>
          <p className="text-base-content/60">基于预设模板创建 - 开发中</p>
        </div>
      );
    default:
      return null;
  }
}

// 复制模式步骤内联组件
function CopyModeStepInline({ sourceData, onSourceDataChange }: { sourceData: SourceData | null; onSourceDataChange: (data: SourceData | null) => void }) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // 默认选择 2025-01，因为该月份有真实的薪资数据
    return '2025-01';
  });
  const [baseStrategy, setBaseStrategy] = useState<'copy' | 'new'>('copy');
  
  // 薪资组件分类数据
  const [categories, setCategories] = useState<SalaryComponentCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // 获取选中月份的薪资数据
  const monthDateRange = getMonthDateRange(selectedMonth);
  const { data: payrollData, isLoading } = usePayrolls({
    page: 1,
    pageSize: 1000
  });

  // 加载薪资组件分类数据
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const data = await salaryComponentFieldsService.getSalaryComponentCategories(selectedMonth);
        setCategories(data);
        // 设置默认选中的分类（推荐配置）
        const defaultSelected = data
          .filter((cat: SalaryComponentCategory) => ['basic_salary', 'allowances', 'deductions', 'personal_insurance', 'personal_benefits'].includes(cat.category))
          .map((cat: SalaryComponentCategory) => cat.category);
        setSelectedCategories(defaultSelected);
      } catch (error) {
        console.error('Failed to load salary component categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [selectedMonth]);

  // Memoize statistics calculation to prevent excessive re-renders
  const statistics = useMemo(() => {
    if (!payrollData?.data || payrollData.data.length === 0) return null;
    
    const totalGrossPay = payrollData.data.reduce((sum, item) => sum + (item.gross_pay || 0), 0);
    const totalNetPay = payrollData.data.reduce((sum, item) => sum + (item.net_pay || 0), 0);
    
    return {
      totalEmployees: payrollData.data.length,
      totalGrossPay,
      totalNetPay,
      avgSalary: payrollData.data.length > 0 ? totalNetPay / payrollData.data.length : 0
    };
  }, [payrollData?.data]);

  // Memoize selected employee IDs to prevent recalculation
  const selectedEmployeeIds = useMemo(() => {
    if (!payrollData?.data) return [];
    return payrollData.data.map(item => item.employee_id).filter(Boolean);
  }, [payrollData?.data]);

  // Split useEffect for data loading - focused on payroll data changes
  useEffect(() => {
    if (payrollData?.data && payrollData.data.length > 0 && statistics) {
      onSourceDataChange({
        type: 'copy',
        sourceMonth: selectedMonth,
        totalRecords: payrollData.total,
        payrollData: payrollData.data,
        statistics,
        baseStrategy,
        selectedCategories,
        categories,
        selectedEmployeeIds
      });
    } else if (!isLoading) {
      onSourceDataChange(null);
    }
  }, [payrollData?.data, payrollData?.total, statistics, selectedEmployeeIds, selectedMonth, isLoading, onSourceDataChange]);

  // Separate effect for configuration changes (baseStrategy, categories)
  useEffect(() => {
    if (payrollData?.data && payrollData.data.length > 0 && statistics) {
      onSourceDataChange({
        type: 'copy',
        sourceMonth: selectedMonth,
        totalRecords: payrollData.total,
        payrollData: payrollData.data,
        statistics,
        baseStrategy,
        selectedCategories,
        categories,
        selectedEmployeeIds
      });
    }
  }, [baseStrategy, selectedCategories, categories]);

  const handleMonthChange = useCallback((month: string) => {
    setSelectedMonth(month);
  }, []);

  const handleCategoryChange = useCallback((category: string, checked: boolean) => {
    setSelectedCategories(prev => 
      checked 
        ? [...prev, category]
        : prev.filter(c => c !== category)
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(c => c.category));
    }
  }, [selectedCategories.length, categories]);

  const handleRecommendedConfiguration = useCallback(() => {
    const recommendedCategories = categories
      .filter(cat => ['basic_salary', 'allowances', 'deductions', 'personal_insurance', 'personal_benefits'].includes(cat.category))
      .map(cat => cat.category);
    setSelectedCategories(recommendedCategories);
  }, [categories]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-base-content mb-2">
          复制上月数据
        </h2>
        <p className="text-base-content/60">
          选择要复制的源薪资周期，系统将基于该周期的数据创建新的薪资记录
        </p>
      </div>

      {/* 月份选择 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            选择源薪资周期
          </h3>
          
          <div className="max-w-md">
            <label className="label">
              <span className="label-text font-medium">薪资月份</span>
            </label>
            <MonthPicker
              value={selectedMonth}
              onChange={handleMonthChange}
              placeholder="选择要复制的月份"
              size="md"
              showDataIndicators={true}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                建议选择最近的已完成薪资周期
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 基数复制策略配置 */}
      {!isLoading && payrollData?.data && payrollData.data.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              📋 数据复制配置
            </h3>
            
            <div className="space-y-6">
              {/* 复制内容选择 - 孔雀屏组件 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-base-content flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    复制内容选择
                  </h4>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={handleSelectAll}
                    >
                      {selectedCategories.length === categories.length ? '全不选' : '全选'}
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={handleRecommendedConfiguration}
                    >
                      推荐配置
                    </button>
                  </div>
                </div>
                
                {/* 孔雀屏组件网格 */}
                {loadingCategories ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="skeleton h-24 w-full"></div>
                    ))}
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-base-content/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h5 className="text-lg font-medium text-base-content/60 mb-2">
                      暂无薪资数据
                    </h5>
                    <p className="text-sm text-base-content/40">
                      {selectedMonth} 月份暂无薪资组件数据
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {categories.map((category) => (
                      <SalaryComponentCard
                        key={category.category}
                        title={category.displayName}
                        subtitle={category.description}
                        icon={<span className="text-xl">{category.icon}</span>}
                        checked={selectedCategories.includes(category.category)}
                        onChange={(checked) => handleCategoryChange(category.category, checked)}
                        variant={salaryComponentFieldsService.getCategoryVariant(category.category)}
                        fieldsData={category.fields.map((field: SalaryFieldStatistic) => ({
                          name: field.field_name,
                          displayName: field.field_display_name,
                          recordCount: field.record_count,
                          avgAmount: field.avg_amount,
                          category: field.component_category
                        }))}
                      />
                    ))}
                  </div>
                )}
                
                {/* 选择统计 */}
                {selectedCategories.length > 0 && (
                  <div className="bg-base-200/50 rounded-lg p-4">
                    <h5 className="font-medium text-base-content mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      复制内容摘要
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {categories.map((category) => {
                        const isSelected = selectedCategories.includes(category.category);
                        return (
                          <div key={category.category} className={`flex items-center gap-2 ${isSelected ? 'text-success' : 'text-base-content/40'}`}>
                            {isSelected ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            <span>{category.displayName}</span>
                            {isSelected && (
                              <span className="text-xs text-base-content/60">
                                ({category.fields.length} 字段)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="alert alert-info">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-bold">复制策略说明</h4>
                    <p className="text-sm">
                      点击各分类卡片展开查看具体字段。仅显示上月有记录且金额大于0的字段。绩效奖金和加班费通常每月重新计算，建议不复制。
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="divider">五险一金基数配置</div>
              
              <div className="space-y-3">
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input 
                      type="radio" 
                      name="baseStrategy" 
                      className="radio radio-primary" 
                      checked={baseStrategy === 'copy'}
                      onChange={() => setBaseStrategy('copy')}
                    />
                    <div>
                      <span className="label-text font-medium">继续使用现有基数（推荐）</span>
                      <p className="text-sm text-base-content/60 mt-1">
                        保持与源月份相同的五险一金缴费基数，适用于常规薪资周期
                      </p>
                    </div>
                  </label>
                </div>
                
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input 
                      type="radio" 
                      name="baseStrategy" 
                      className="radio radio-primary" 
                      checked={baseStrategy === 'new'}
                      onChange={() => setBaseStrategy('new')}
                    />
                    <div>
                      <span className="label-text font-medium">设置新的缴费基数</span>
                      <p className="text-sm text-base-content/60 mt-1">
                        调整五险一金缴费基数，适用于年初调整或政策变更
                      </p>
                    </div>
                  </label>
                </div>
              </div>
              
              {baseStrategy === 'new' && (
                <div className="alert alert-info">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-bold">基数配置提示</h4>
                    <p className="text-sm">
                      您已选择调整缴费基数，在下一步"数据配置"中将提供详细的基数设置选项。
                    </p>
                  </div>
                </div>
              )}
              
              <div className="alert alert-warning">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 8.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="font-bold">智能推荐</h4>
                  <p className="text-sm">
                    年初月份（1月）建议选择"设置新的缴费基数"，年中月份建议选择"继续使用现有基数"。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 数据预览 */}
      {isLoading && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <LoadingScreen message="正在加载薪资数据..." />
          </div>
        </div>
      )}

      {!isLoading && payrollData?.data && payrollData.data.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              数据预览 - {formatMonth(selectedMonth)}
            </h3>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="stat bg-primary/5 rounded-lg border border-primary/20">
                <div className="stat-title text-primary">员工总数</div>
                <div className="stat-value text-primary">{sourceData?.statistics?.totalEmployees || 0}</div>
                <div className="stat-desc">条薪资记录</div>
              </div>
              <div className="stat bg-success/5 rounded-lg border border-success/20">
                <div className="stat-title text-success">应发总额</div>
                <div className="stat-value text-success text-lg">
                  {formatCurrency(sourceData?.statistics?.totalGrossPay || 0)}
                </div>
                <div className="stat-desc">含所有收入项</div>
              </div>
              <div className="stat bg-info/5 rounded-lg border border-info/20">
                <div className="stat-title text-info">实发总额</div>
                <div className="stat-value text-info text-lg">
                  {formatCurrency(sourceData?.statistics?.totalNetPay || 0)}
                </div>
                <div className="stat-desc">扣除后金额</div>
              </div>
              <div className="stat bg-warning/5 rounded-lg border border-warning/20">
                <div className="stat-title text-warning">平均实发</div>
                <div className="stat-value text-warning text-lg">
                  {formatCurrency(sourceData?.statistics?.avgSalary || 0)}
                </div>
                <div className="stat-desc">每人平均</div>
              </div>
            </div>

            {/* 数据样例 */}
            <div className="overflow-x-auto">
              <table className="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th>员工姓名</th>
                    <th>身份证号</th>
                    <th>应发工资</th>
                    <th>实发工资</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.data.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td>{item.employee?.employee_name || '未知'}</td>
                      <td className="font-mono text-xs">{item.employee?.id_number || '-'}</td>
                      <td className="font-mono text-success">{formatCurrency(item.gross_pay)}</td>
                      <td className="font-mono text-primary">{formatCurrency(item.net_pay)}</td>
                      <td>
                        <div className={cn(
                          "badge badge-sm",
                          item.status === 'paid' ? "badge-success" : "badge-warning"
                        )}>
                          {item.status}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payrollData.data.length > 5 && (
                <div className="text-center py-2 text-sm text-base-content/60">
                  ... 还有 {payrollData.data.length - 5} 条记录
                </div>
              )}
            </div>

            {/* 提示信息 */}
            <div className="alert alert-info">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-bold">复制说明</h4>
                <p className="text-sm">
                  将复制员工的基本薪资结构和组件配置，但金额会根据最新的薪资标准重新计算。
                  复制完成后，您可以在下一步调整具体的薪资参数。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && (!payrollData?.data || payrollData.data.length === 0) && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-medium text-base-content mb-2">
              选中月份暂无薪资数据
            </h3>
            <p className="text-base-content/60 mb-4">
              {formatMonth(selectedMonth)} 还没有薪资记录，请选择其他月份或改用其他创建方式。
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedMonth(getPreviousMonth())}
              >
                选择上月
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 步骤3：数据配置步骤组件
interface DataConfigurationStepProps {
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
}

function DataConfigurationStep({ wizardState, updateWizardState }: DataConfigurationStepProps) {
  const needsBaseConfiguration = wizardState.sourceData?.baseStrategy === 'new';
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-base-content mb-2">配置薪资周期参数</h2>
        <p className="text-base-content/60">设置新薪资周期的基本信息，避免与已有数据冲突</p>
      </div>
      
      {/* 基本参数配置 */}
      <div className="card bg-base-100 shadow-xl max-w-2xl mx-auto">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            基本参数
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="label">
                <span className="label-text font-medium text-lg">薪资期间</span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <MonthPicker
                value={wizardState.payrollPeriod}
                onChange={(value) => updateWizardState({ payrollPeriod: value })}
                placeholder="选择薪资月份"
                size="md"
                showDataIndicators={true}
                disableMonthsWithData={true}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  选择此次薪资计算的月份，已有数据的月份将被自动禁用
                </span>
              </label>
            </div>
            <div>
              <label className="label">
                <span className="label-text font-medium text-lg">支付日期</span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <input
                type="date"
                value={wizardState.payDate}
                onChange={(e) => updateWizardState({ payDate: e.target.value })}
                className="input input-bordered w-full"
                placeholder="选择支付日期"
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  实际支付工资的日期
                </span>
              </label>
            </div>
          </div>
          
          {/* 基本参数提示信息 */}
          <div className="alert alert-info">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-bold">参数配置说明</h4>
              <p className="text-sm">
                红色数字表示该月份已有薪资数据，无法重复创建。请选择其他月份或使用复制模式基于现有数据创建。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 五险一金基数配置 */}
      {needsBaseConfiguration && (
        <InsuranceBaseConfigurationCard 
          wizardState={wizardState}
          updateWizardState={updateWizardState}
        />
      )}
    </div>
  );
}

// 五险一金基数配置卡片组件
interface InsuranceBaseConfigurationCardProps {
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
}

function InsuranceBaseConfigurationCard({ wizardState, updateWizardState }: InsuranceBaseConfigurationCardProps) {
  const [configMode, setConfigMode] = useState<'batch' | 'individual' | 'import'>('batch');
  const [adjustmentType, setAdjustmentType] = useState<'percentage' | 'fixed' | 'template'>('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(110);
  const [fixedAmount, setFixedAmount] = useState<number>(500);
  
  return (
    <div className="card bg-base-100 shadow-xl max-w-4xl mx-auto">
      <div className="card-body">
        <h3 className="card-title text-lg mb-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          🏦 五险一金基数配置
        </h3>
        
        {/* 配置方式选择 */}
        <div className="mb-6">
          <h4 className="font-medium text-base-content mb-3">配置方式：</h4>
          <div className="flex gap-4">
            <label className="label cursor-pointer justify-start gap-2">
              <input 
                type="radio" 
                name="configMode" 
                className="radio radio-primary radio-sm" 
                checked={configMode === 'batch'}
                onChange={() => setConfigMode('batch')}
              />
              <span className="label-text">批量调整</span>
            </label>
            <label className="label cursor-pointer justify-start gap-2">
              <input 
                type="radio" 
                name="configMode" 
                className="radio radio-primary radio-sm" 
                checked={configMode === 'individual'}
                onChange={() => setConfigMode('individual')}
              />
              <span className="label-text">逐个设置</span>
            </label>
            <label className="label cursor-pointer justify-start gap-2">
              <input 
                type="radio" 
                name="configMode" 
                className="radio radio-primary radio-sm" 
                checked={configMode === 'import'}
                onChange={() => setConfigMode('import')}
              />
              <span className="label-text">导入Excel</span>
            </label>
          </div>
        </div>

        {/* 批量调整模式 */}
        {configMode === 'batch' && (
          <div className="space-y-4">
            <h4 className="font-medium text-base-content">批量调整选项：</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <input 
                    type="checkbox" 
                    className="checkbox checkbox-primary checkbox-sm" 
                    checked={adjustmentType === 'percentage'}
                    onChange={() => setAdjustmentType('percentage')}
                  />
                  <span className="label-text">按比例调整</span>
                </label>
                <div className="flex items-center gap-2 ml-6">
                  <input
                    type="number"
                    value={adjustmentValue}
                    onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                    className="input input-bordered input-sm w-20"
                    min="50"
                    max="300"
                    disabled={adjustmentType !== 'percentage'}
                  />
                  <span className="text-sm text-base-content/60">% 原基数</span>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <input 
                    type="checkbox" 
                    className="checkbox checkbox-primary checkbox-sm" 
                    checked={adjustmentType === 'fixed'}
                    onChange={() => setAdjustmentType('fixed')}
                  />
                  <span className="label-text">固定增加</span>
                </label>
                <div className="flex items-center gap-2 ml-6">
                  <input
                    type="number"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(Number(e.target.value))}
                    className="input input-bordered input-sm w-20"
                    min="-5000"
                    max="5000"
                    disabled={adjustmentType !== 'fixed'}
                  />
                  <span className="text-sm text-base-content/60">元/人/项</span>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <input 
                    type="checkbox" 
                    className="checkbox checkbox-primary checkbox-sm" 
                    checked={adjustmentType === 'template'}
                    onChange={() => setAdjustmentType('template')}
                  />
                  <span className="label-text">应用基数模板</span>
                </label>
                <div className="ml-6">
                  <select 
                    className="select select-bordered select-sm w-full max-w-xs"
                    disabled={adjustmentType !== 'template'}
                  >
                    <option>选择模板</option>
                    <option>2025年标准基数</option>
                    <option>管理岗位基数</option>
                    <option>普通员工基数</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* 影响预览 */}
            <div className="bg-info/5 border border-info/20 rounded-lg p-4">
              <h5 className="font-medium text-info mb-2">📊 影响预览：</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-base-content/60">影响员工：</span>
                  <span className="font-medium">52人</span>
                </div>
                <div>
                  <span className="text-base-content/60">基数变化：</span>
                  <span className="font-medium">养老+500, 医疗+500...</span>
                </div>
                <div>
                  <span className="text-base-content/60">个人费用影响：</span>
                  <span className="font-medium text-error">+1,200元</span>
                </div>
                <div>
                  <span className="text-base-content/60">单位费用影响：</span>
                  <span className="font-medium text-warning">+2,800元</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 逐个设置模式 */}
        {configMode === 'individual' && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">👥</div>
            <h4 className="font-medium text-base-content mb-2">逐个设置模式</h4>
            <p className="text-base-content/60">
              将在下一步提供员工列表，支持单独调整每个员工的各项基数
            </p>
          </div>
        )}

        {/* 导入Excel模式 */}
        {configMode === 'import' && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📁</div>
            <h4 className="font-medium text-base-content mb-2">Excel导入模式</h4>
            <p className="text-base-content/60 mb-4">
              支持从Excel文件批量导入员工基数配置
            </p>
            <button className="btn btn-outline btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              下载模板文件
            </button>
          </div>
        )}

        {/* 基数配置说明 */}
        <div className="alert alert-warning">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 8.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="font-bold">基数调整提醒</h4>
            <p className="text-sm">
              调整缴费基数将影响五险一金的缴费金额，请确保符合当地社保政策要求。调整后的基数将从新薪资周期开始生效。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


// Wrapper for the enhanced ConfirmationStep to match the expected interface
interface ConfirmationStepProps {
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
  onComplete: (result?: { success: boolean; periodId?: string; error?: string }) => void;
}

function ConfirmationStep({ wizardState, updateWizardState, onComplete }: ConfirmationStepProps) {
  // Use the enhanced ConfirmationStep component with debugging
  return (
    <EnhancedConfirmationStep 
      wizardState={wizardState} 
      onConfirm={onComplete}
    />
  );
}