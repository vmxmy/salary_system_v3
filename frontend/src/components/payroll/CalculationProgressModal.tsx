import React from 'react';
import { cn } from '@/lib/utils';

interface CalculationStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number; // 0-100
  message?: string;
  error?: string;
}

interface CalculationProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: CalculationStep[];
  currentStep?: string;
  totalProgress: number; // 0-100
  allowCancel?: boolean;
  onCancel?: () => void;
  className?: string;
}

export function CalculationProgressModal({
  isOpen,
  onClose,
  title,
  steps,
  currentStep,
  totalProgress,
  allowCancel = false,
  onCancel,
  className
}: CalculationProgressModalProps) {
  if (!isOpen) return null;

  const isCompleted = steps.every(step => step.status === 'completed');
  const hasError = steps.some(step => step.status === 'error');
  const isRunning = steps.some(step => step.status === 'running');

  const getStepIcon = (step: CalculationStep) => {
    switch (step.status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'running':
        return <span className="loading loading-spinner loading-sm text-primary"></span>;
      case 'error':
        return (
          <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-base-300"></div>
        );
    }
  };

  const getStepStatusColor = (step: CalculationStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-success';
      case 'running':
        return 'text-primary';
      case 'error':
        return 'text-error';
      default:
        return 'text-base-content/60';
    }
  };

  return (
    <div className="modal modal-open">
      <div className={cn(
        "modal-box w-11/12 max-w-2xl",
        className
      )}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between pb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            {isRunning && (
              <span className="loading loading-spinner loading-sm text-primary"></span>
            )}
            {title}
          </h3>
          {!isRunning && (
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6m0 12L6 6" />
              </svg>
            </button>
          )}
        </div>

        {/* 总体进度条 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">总体进度</span>
            <span className="text-sm text-base-content/70">{Math.round(totalProgress)}%</span>
          </div>
          <div className="w-full bg-base-200 rounded-full h-2">
            <div 
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                hasError ? "bg-error" : isCompleted ? "bg-success" : "bg-primary"
              )}
              style={{ width: `${totalProgress}%` }}
            ></div>
          </div>
        </div>

        {/* 步骤列表 */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg transition-colors",
                step.status === 'running' ? "bg-primary/5" : "bg-base-50",
                currentStep === step.id ? "ring-2 ring-primary/20" : ""
              )}
            >
              {/* 步骤图标 */}
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(step)}
              </div>

              {/* 步骤内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    "font-medium",
                    getStepStatusColor(step)
                  )}>
                    {step.name}
                  </h4>
                  {step.progress !== undefined && step.status === 'running' && (
                    <span className="text-xs text-base-content/70">
                      {Math.round(step.progress)}%
                    </span>
                  )}
                </div>

                {/* 步骤进度条 */}
                {step.progress !== undefined && step.status === 'running' && (
                  <div className="w-full bg-base-200 rounded-full h-1 mt-2">
                    <div 
                      className="h-1 bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    ></div>
                  </div>
                )}

                {/* 步骤消息 */}
                {step.message && (
                  <p className="text-sm text-base-content/70 mt-1">
                    {step.message}
                  </p>
                )}

                {/* 错误信息 */}
                {step.error && step.status === 'error' && (
                  <div className="mt-2 p-2 bg-error/10 rounded text-sm text-error">
                    {step.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="modal-action">
          {isRunning && allowCancel && onCancel && (
            <button
              className="btn btn-outline btn-error"
              onClick={onCancel}
            >
              取消计算
            </button>
          )}
          {!isRunning && (
            <button
              className="btn btn-primary"
              onClick={onClose}
            >
              {hasError ? '关闭' : '完成'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 默认导出
export default CalculationProgressModal;

// 预定义的步骤模板
export const INSURANCE_CALCULATION_STEPS = [
  { id: 'insurance_prepare', name: '准备五险一金计算数据' },
  { id: 'insurance_calculate', name: '批量计算五险一金' },
  { id: 'insurance_save', name: '保存五险一金计算结果' }
];

export const PAYROLL_CALCULATION_STEPS = [
  { id: 'payroll_prepare', name: '准备薪资汇总数据' },
  { id: 'payroll_calculate', name: '批量计算薪资汇总' },
  { id: 'payroll_save', name: '保存薪资汇总结果' }
];

export const COMBINED_CALCULATION_STEPS = [
  ...INSURANCE_CALCULATION_STEPS,
  ...PAYROLL_CALCULATION_STEPS
];