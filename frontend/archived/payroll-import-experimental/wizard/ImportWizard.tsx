/**
 * 导入向导组件
 * 提供分步骤的导入流程指导
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { cardEffects } from '@/styles/design-effects';
import { MonthSelector } from '../config/MonthSelector';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ImportMode, SalaryComponentCategory } from '@/hooks/payroll/import-export/types';
import type { AvailablePayrollMonth } from '@/hooks/payroll/useAvailablePayrollMonths';
import { ErrorHandlingDisplay, type ErrorInfo, useErrorHandling } from '../common/ErrorHandlingDisplay';
import { ProgressDisplay, type ProgressData } from '../common/ProgressDisplay';

/**
 * 向导步骤常量
 */
export const WizardStep = {
  WELCOME: 'welcome',
  PERIOD_SELECTION: 'period_selection',
  DATA_CONFIG: 'data_config',
  FILE_UPLOAD: 'file_upload',
  PREVIEW: 'preview',
  IMPORT: 'import',
  COMPLETE: 'complete'
} as const;

export type WizardStepType = typeof WizardStep[keyof typeof WizardStep];

/**
 * 向导配置接口
 */
export interface WizardConfig {
  selectedMonth: string;
  selectedDataGroups: ImportDataGroup[];
  importMode: ImportMode;
  selectedCategories: SalaryComponentCategory[];
  file: File | null;
}

/**
 * 向导Props
 */
interface ImportWizardProps {
  availableMonths: AvailablePayrollMonth[] | undefined;
  isLoadingMonths: boolean;
  progress?: ProgressData;
  onConfigChange: (config: Partial<WizardConfig>) => void;
  onFileUpload: (file: File) => Promise<void>;
  onStartImport: () => Promise<void>;
  onReset: () => void;
  className?: string;
}

/**
 * 步骤配置
 */
const stepConfig = {
  [WizardStep.WELCOME]: { 
    title: '欢迎使用薪资导入向导', 
    icon: '👋', 
    description: '我们将引导您完成整个导入流程' 
  },
  [WizardStep.PERIOD_SELECTION]: { 
    title: '选择薪资周期', 
    icon: '📅', 
    description: '选择要导入数据的薪资周期' 
  },
  [WizardStep.DATA_CONFIG]: { 
    title: '数据配置', 
    icon: '⚙️', 
    description: '配置导入的数据类型和选项' 
  },
  [WizardStep.FILE_UPLOAD]: { 
    title: '上传Excel文件', 
    icon: '📁', 
    description: '上传包含薪资数据的Excel文件' 
  },
  [WizardStep.PREVIEW]: { 
    title: '预览和确认', 
    icon: '👀', 
    description: '预览解析结果并确认导入' 
  },
  [WizardStep.IMPORT]: { 
    title: '导入数据', 
    icon: '🚀', 
    description: '正在执行数据导入' 
  },
  [WizardStep.COMPLETE]: { 
    title: '导入完成', 
    icon: '✅', 
    description: '数据导入已完成' 
  }
};

/**
 * 导入向导主组件
 */
export const ImportWizard: React.FC<ImportWizardProps> = ({
  availableMonths,
  isLoadingMonths,
  progress,
  onConfigChange,
  onFileUpload,
  onStartImport,
  onReset,
  className
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStepType>(WizardStep.WELCOME);
  const [config, setConfig] = useState<WizardConfig>({
    selectedMonth: '2025-01',
    selectedDataGroups: [ImportDataGroup.EARNINGS],
    importMode: 'upsert',
    selectedCategories: ['basic_salary', 'benefits', 'personal_tax', 'other_deductions'],
    file: null
  });

  const { errors, addError, removeError, clearAllErrors } = useErrorHandling();

  // 步骤数组
  const steps = Object.values(WizardStep);
  const currentStepIndex = steps.indexOf(currentStep);

  /**
   * 更新配置
   */
  const updateConfig = useCallback((updates: Partial<WizardConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(updates);
  }, [config, onConfigChange]);

  /**
   * 验证当前步骤
   */
  const validateCurrentStep = useCallback((): boolean => {
    clearAllErrors();

    switch (currentStep) {
      case WizardStep.PERIOD_SELECTION:
        if (!config.selectedMonth) {
          addError({
            type: 'validation',
            severity: 'high',
            message: '请选择薪资周期'
          });
          return false;
        }
        break;

      case WizardStep.DATA_CONFIG:
        if (config.selectedDataGroups.length === 0) {
          addError({
            type: 'validation',
            severity: 'high',
            message: '请至少选择一个数据组类型'
          });
          return false;
        }
        break;

      case WizardStep.FILE_UPLOAD:
        if (!config.file) {
          addError({
            type: 'file',
            severity: 'high',
            message: '请选择要上传的Excel文件'
          });
          return false;
        }
        break;

      default:
        return true;
    }

    return true;
  }, [currentStep, config, addError, clearAllErrors]);

  /**
   * 下一步
   */
  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) {
      return;
    }

    const nextStepIndex = Math.min(currentStepIndex + 1, steps.length - 1);
    const nextStep = steps[nextStepIndex];

    // 特殊处理文件上传步骤
    if (currentStep === WizardStep.FILE_UPLOAD && config.file) {
      try {
        await onFileUpload(config.file);
      } catch (error) {
        addError({
          type: 'file',
          severity: 'critical',
          message: `文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
        return;
      }
    }

    // 特殊处理预览步骤
    if (currentStep === WizardStep.PREVIEW) {
      try {
        await onStartImport();
        setCurrentStep(WizardStep.IMPORT);
        return;
      } catch (error) {
        addError({
          type: 'import',
          severity: 'critical',
          message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
        return;
      }
    }

    setCurrentStep(nextStep);
  }, [currentStep, currentStepIndex, steps, config, validateCurrentStep, onFileUpload, onStartImport, addError]);

  /**
   * 上一步
   */
  const handlePrevious = useCallback(() => {
    const prevStepIndex = Math.max(currentStepIndex - 1, 0);
    setCurrentStep(steps[prevStepIndex]);
    clearAllErrors();
  }, [currentStepIndex, steps, clearAllErrors]);

  /**
   * 重置向导
   */
  const handleReset = useCallback(() => {
    setCurrentStep(WizardStep.WELCOME);
    setConfig({
      selectedMonth: '2025-01',
      selectedDataGroups: [ImportDataGroup.EARNINGS],
      importMode: 'upsert',
      selectedCategories: ['basic_salary', 'benefits', 'personal_tax', 'other_deductions'],
      file: null
    });
    clearAllErrors();
    onReset();
  }, [clearAllErrors, onReset]);

  /**
   * 文件选择处理
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateConfig({ file });
      clearAllErrors();
    }
  }, [updateConfig, clearAllErrors]);

  /**
   * 获取步骤状态
   */
  const getStepStatus = (step: WizardStepType): 'completed' | 'active' | 'pending' => {
    const stepIndex = steps.indexOf(step);
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'active';
    return 'pending';
  };

  /**
   * 渲染步骤指示器
   */
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-2">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const stepInfo = stepConfig[step];

          return (
            <React.Fragment key={step}>
              <div className="flex items-center">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all',
                  status === 'completed' && 'bg-success text-success-content',
                  status === 'active' && 'bg-primary text-primary-content ring-2 ring-primary/20',
                  status === 'pending' && 'bg-base-300 text-base-content'
                )}>
                  {status === 'completed' ? '✓' : stepInfo.icon}
                </div>
                <div className="ml-2 hidden md:block">
                  <div className={cn(
                    'text-sm font-medium',
                    status === 'active' && 'text-primary',
                    status === 'pending' && 'text-base-content/50'
                  )}>
                    {stepInfo.title}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  'w-8 h-0.5 mx-2',
                  status === 'completed' ? 'bg-success' : 'bg-base-300'
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  /**
   * 渲染步骤内容
   */
  const renderStepContent = () => {
    const stepInfo = stepConfig[currentStep];

    return (
      <div className={cn(cardEffects.primary, 'p-8')}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">{stepInfo.icon}</div>
          <h2 className="text-2xl font-bold mb-2">{stepInfo.title}</h2>
          <p className="text-base-content/70">{stepInfo.description}</p>
        </div>

        {/* 步骤内容 */}
        <div className="max-w-2xl mx-auto">
          {currentStep === WizardStep.WELCOME && (
            <div className="text-center space-y-4">
              <div className="alert alert-info">
                <div>
                  <h3 className="font-semibold mb-2">开始之前，请确保：</h3>
                  <ul className="list-disc list-inside text-sm space-y-1 text-left">
                    <li>您有权限导入薪资数据</li>
                    <li>Excel文件格式正确且数据完整</li>
                    <li>已选择正确的薪资周期</li>
                    <li>了解导入模式的区别（更新 vs 替换）</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {currentStep === WizardStep.PERIOD_SELECTION && (
            <div className="space-y-4">
              <MonthSelector
                selectedMonth={config.selectedMonth}
                onMonthChange={(month) => updateConfig({ selectedMonth: month })}
                availableMonths={availableMonths || []}
                loading={isLoadingMonths}
              />
              
              {config.selectedMonth && (
                <div className="alert alert-success">
                  <div>
                    已选择薪资周期：<strong>{config.selectedMonth}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === WizardStep.DATA_CONFIG && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">选择数据组类型</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: ImportDataGroup.EARNINGS, label: '薪资明细', desc: '基本工资、津贴、奖金等' },
                    { key: ImportDataGroup.CONTRIBUTION_BASES, label: '缴费基数', desc: '社保、公积金缴费基数' },
                    { key: ImportDataGroup.CATEGORY_ASSIGNMENT, label: '人员类别', desc: '员工类别分配信息' },
                    { key: ImportDataGroup.JOB_ASSIGNMENT, label: '部门职位', desc: '员工部门和职位信息' }
                  ].map(group => (
                    <label key={group.key} className={cn(
                      'flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all',
                      config.selectedDataGroups.includes(group.key)
                        ? 'border-primary bg-primary/5'
                        : 'border-base-300 hover:border-base-400'
                    )}>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary mt-1"
                        checked={config.selectedDataGroups.includes(group.key)}
                        onChange={(e) => {
                          const newGroups = e.target.checked
                            ? [...config.selectedDataGroups, group.key]
                            : config.selectedDataGroups.filter(g => g !== group.key);
                          updateConfig({ selectedDataGroups: newGroups });
                        }}
                      />
                      <div>
                        <div className="font-medium">{group.label}</div>
                        <div className="text-sm text-base-content/60">{group.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">导入模式</h3>
                <div className="space-y-3">
                  {[
                    { value: 'upsert', label: 'UPSERT (更新或插入)', desc: '更新已有数据，插入新数据' },
                    { value: 'replace', label: 'REPLACE (完全替换)', desc: '清空现有数据，重新导入' }
                  ].map(mode => (
                    <label key={mode.value} className={cn(
                      'flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all',
                      config.importMode === mode.value
                        ? 'border-primary bg-primary/5'
                        : 'border-base-300 hover:border-base-400'
                    )}>
                      <input
                        type="radio"
                        name="importMode"
                        className="radio radio-primary mt-1"
                        checked={config.importMode === mode.value}
                        onChange={() => updateConfig({ importMode: mode.value as ImportMode })}
                      />
                      <div>
                        <div className="font-medium">{mode.label}</div>
                        <div className="text-sm text-base-content/60">{mode.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === WizardStep.FILE_UPLOAD && (
            <div className="space-y-4">
              <div className="text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="file-input file-input-bordered file-input-lg w-full max-w-md"
                />
              </div>
              
              {config.file && (
                <div className="alert alert-success">
                  <div>
                    <div className="flex items-center gap-2">
                      <span>✓</span>
                      <span>已选择文件：<strong>{config.file.name}</strong></span>
                    </div>
                    <div className="text-sm mt-1">
                      文件大小：{Math.round(config.file.size / 1024)}KB
                    </div>
                  </div>
                </div>
              )}

              <div className="alert alert-info">
                <div>
                  <h4 className="font-semibold mb-2">文件格式要求：</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>支持 .xlsx 和 .xls 格式</li>
                    <li>第一行应为表头</li>
                    <li>员工姓名列必须存在</li>
                    <li>数值列应为数字格式</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {currentStep === WizardStep.PREVIEW && (
            <div className="space-y-4">
              <div className="alert alert-warning">
                <div>
                  <h4 className="font-semibold mb-2">准备导入</h4>
                  <div className="space-y-1 text-sm">
                    <div>薪资周期：<strong>{config.selectedMonth}</strong></div>
                    <div>数据类型：<strong>{config.selectedDataGroups.length} 个</strong></div>
                    <div>导入模式：<strong>{config.importMode === 'upsert' ? '更新/插入' : '完全替换'}</strong></div>
                    <div>文件：<strong>{config.file?.name}</strong></div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-base-content/70">
                  点击"开始导入"将执行数据导入操作
                </p>
              </div>
            </div>
          )}

          {currentStep === WizardStep.IMPORT && progress && (
            <div className="space-y-4">
              <ProgressDisplay 
                progress={progress}
                style="detailed"
                showTimeEstimate={true}
              />
            </div>
          )}

          {currentStep === WizardStep.COMPLETE && (
            <div className="text-center space-y-4">
              <div className="alert alert-success">
                <div>
                  <h3 className="font-semibold mb-2">🎉 导入完成！</h3>
                  <p className="text-sm">所有数据已成功导入到系统中</p>
                </div>
              </div>
              
              <div className="flex justify-center gap-4">
                <button className="btn btn-outline" onClick={handleReset}>
                  重新开始
                </button>
                <button className="btn btn-primary">
                  查看结果
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 错误显示 */}
        {errors.length > 0 && (
          <div className="mt-6">
            <ErrorHandlingDisplay 
              errors={errors}
              onDismiss={removeError}
              onClearAll={clearAllErrors}
            />
          </div>
        )}

        {/* 导航按钮 */}
        {currentStep !== WizardStep.COMPLETE && (
          <div className="flex justify-between mt-8">
            <button
              className="btn btn-outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
            >
              上一步
            </button>
            
            <div className="flex gap-2">
              <button
                className="btn btn-ghost"
                onClick={handleReset}
              >
                重置
              </button>
              
              <button
                className="btn btn-primary"
                onClick={handleNext}
                disabled={currentStep === WizardStep.IMPORT}
              >
                {currentStep === WizardStep.PREVIEW ? '开始导入' : '下一步'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      {renderStepIndicator()}
      {renderStepContent()}
    </div>
  );
};

export default ImportWizard;