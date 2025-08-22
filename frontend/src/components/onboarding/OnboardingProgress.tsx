/**
 * 新用户指导进度组件
 * 
 * 特性：
 * 1. 可视化进度 - 清晰的步骤指示和完成状态
 * 2. 交互式导航 - 支持点击跳转到已完成的步骤
 * 3. 响应式布局 - 支持水平和垂直方向
 * 4. 动画效果 - 平滑的进度更新动画
 * 5. 状态指示 - 不同的图标表示步骤状态
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  ChevronRightIcon,
  PlayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import type { OnboardingProgressProps, StepStatus } from '@/types/onboarding';

export const OnboardingProgress = ({
  flow,
  progress,
  showStepNames = false,
  orientation = 'horizontal',
  size = 'md',
  className = ''
}: OnboardingProgressProps) => {
  const { t } = useTranslation('onboarding');

  // 获取步骤状态
  const getStepStatus = useCallback((stepId: string, stepIndex: number): StepStatus => {
    if (progress.completedSteps.includes(stepId)) {
      return 'completed';
    }
    if (progress.skippedSteps.includes(stepId)) {
      return 'skipped';
    }
    if (progress.currentStepId === stepId) {
      return 'active';
    }
    if (stepIndex < progress.completedSteps.length + progress.skippedSteps.length) {
      return 'pending';
    }
    return 'pending';
  }, [progress]);

  // 获取步骤图标
  const getStepIcon = useCallback((status: StepStatus, stepIndex: number) => {
    const iconClass = `w-${size === 'sm' ? '4' : size === 'lg' ? '6' : '5'} h-${size === 'sm' ? '4' : size === 'lg' ? '6' : '5'}`;
    
    switch (status) {
      case 'completed':
        return <CheckIcon className={`${iconClass} text-success`} />;
      case 'skipped':
        return <XMarkIcon className={`${iconClass} text-base-content/40`} />;
      case 'active':
        return <PlayIcon className={`${iconClass} text-primary`} />;
      default:
        return (
          <div className={`${iconClass} rounded-full border-2 border-base-300 flex items-center justify-center text-xs font-medium text-base-content/60`}>
            {stepIndex + 1}
          </div>
        );
    }
  }, [size]);

  // 获取连接线样式
  const getConnectorClass = useCallback((stepIndex: number) => {
    const isCompleted = stepIndex < progress.completedSteps.length + progress.skippedSteps.length;
    const baseClass = orientation === 'horizontal' 
      ? 'absolute top-1/2 left-full w-full h-0.5 -translate-y-1/2' 
      : 'absolute left-1/2 top-full h-full w-0.5 -translate-x-1/2';
    
    return `${baseClass} ${isCompleted ? 'bg-primary' : 'bg-base-300'} transition-colors duration-500`;
  }, [orientation, progress]);

  // 计算整体进度百分比
  const overallProgress = Math.round((progress.completedSteps.length / flow.steps.length) * 100);

  return (
    <div className={`onboarding-progress ${className}`}>
      {/* 整体进度条 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-base-content">
            {flow.name}
          </h4>
          <span className="text-sm text-base-content/60">
            {overallProgress}%
          </span>
        </div>
        <div className="w-full bg-base-300 rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-700 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* 步骤列表 */}
      <div
        className={`relative ${
          orientation === 'horizontal'
            ? 'flex items-center space-x-4 overflow-x-auto pb-2'
            : 'flex flex-col space-y-4'
        }`}
      >
        {flow.steps.map((step, index) => {
          const status = getStepStatus(step.id, index);
          const isLastStep = index === flow.steps.length - 1;
          const isInteractive = status === 'completed' || status === 'active';

          return (
            <div
              key={step.id}
              className={`relative flex-shrink-0 ${
                orientation === 'horizontal' ? 'flex flex-col items-center' : 'flex items-center'
              }`}
            >
              {/* 步骤指示器 */}
              <div
                className={`relative flex items-center justify-center ${
                  size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
                } rounded-full transition-all duration-300 ${
                  status === 'active'
                    ? 'bg-primary/10 border-2 border-primary shadow-lg ring-4 ring-primary/20'
                    : status === 'completed'
                    ? 'bg-success/10 border-2 border-success'
                    : status === 'skipped'
                    ? 'bg-base-200 border-2 border-base-300'
                    : 'bg-base-100 border-2 border-base-300'
                } ${
                  isInteractive ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                }`}
                role={isInteractive ? 'button' : 'presentation'}
                tabIndex={isInteractive ? 0 : -1}
                aria-label={
                  isInteractive
                    ? t('goToStep', { step: step.title })
                    : t('stepStatus', { step: step.title, status })
                }
              >
                {getStepIcon(status, index)}

                {/* 活跃步骤的脉冲动画 */}
                {status === 'active' && (
                  <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                )}
              </div>

              {/* 步骤标题（可选） */}
              {showStepNames && (
                <div
                  className={`${
                    orientation === 'horizontal'
                      ? 'mt-2 text-center max-w-20'
                      : 'ml-3 flex-1'
                  }`}
                >
                  <div
                    className={`text-xs font-medium ${
                      status === 'active'
                        ? 'text-primary'
                        : status === 'completed'
                        ? 'text-success'
                        : 'text-base-content/60'
                    }`}
                  >
                    {step.title}
                  </div>
                  {status === 'skipped' && (
                    <div className="text-xs text-base-content/40 mt-1">
                      {t('skipped')}
                    </div>
                  )}
                </div>
              )}

              {/* 连接线 */}
              {!isLastStep && (
                <div className={getConnectorClass(index)}>
                  {orientation === 'horizontal' ? (
                    <ChevronRightIcon className="absolute right-0 top-1/2 w-4 h-4 -translate-y-1/2 text-base-content/30" />
                  ) : (
                    <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-primary rounded-full -translate-x-1/2 opacity-0 animate-pulse" 
                         style={{ animationDelay: `${index * 100}ms` }} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 进度统计 */}
      <div className="mt-4 text-xs text-base-content/60 text-center">
        {t('progressStats', {
          completed: progress.completedSteps.length,
          total: flow.steps.length,
          skipped: progress.skippedSteps.length
        })}
      </div>
    </div>
  );
};