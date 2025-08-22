/**
 * 新用户指导渲染器
 * 
 * 核心功能：
 * 1. 统一渲染 - 根据当前状态渲染合适的指导组件
 * 2. 生命周期管理 - 处理指导的启动、暂停、恢复和完成
 * 3. 错误处理 - 优雅处理各种异常情况
 * 4. 性能优化 - 按需加载和渲染组件
 */

import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAutoNavigation } from '@/hooks/useAutoNavigation';
import { OnboardingTooltip } from './OnboardingTooltip';
import { OnboardingOverlay } from './OnboardingOverlay';
import { OnboardingOverlayNative } from './OnboardingOverlayNative';
import { OnboardingProgress } from './OnboardingProgress';

interface OnboardingRendererProps {
  showProgress?: boolean;
  progressPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export const OnboardingRenderer = ({
  showProgress = true,
  progressPosition = 'top-right',
  className = ''
}: OnboardingRendererProps) => {
  const {
    currentFlow,
    currentStep,
    progress,
    isActive,
    config,
    nextStep,
    previousStep,
    skipStep,
    completeFlow,
    canSkip,
    canGoBack,
    getStepProgress,
    getTotalProgress
  } = useOnboarding();

  const containerRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef<string | null>(null);
  const { executeStepAction } = useAutoNavigation();

  // 获取目标元素
  const getTargetElement = useCallback(() => {
    if (!currentStep?.targetElement) {
      console.log(`[OnboardingRenderer] No targetElement for step: ${currentStep?.id} (type: ${currentStep?.type})`);
      return null;
    }
    
    const element = document.querySelector(currentStep.targetElement);
    console.log(`[OnboardingRenderer] Looking for targetElement: ${currentStep.targetElement}`, {
      found: !!element,
      element
    });
    
    return element;
  }, [currentStep?.targetElement]);

  // 处理下一步 - 必须在useEffect之前定义
  const handleNext = useCallback(async () => {
    try {
      await nextStep();
    } catch (error) {
      console.error('Failed to proceed to next step:', error);
    }
  }, [nextStep]);

  // 关闭指导
  const handleClose = useCallback(async () => {
    try {
      await completeFlow();
    } catch (error) {
      console.error('Failed to close onboarding:', error);
    }
  }, [completeFlow]);

  // 处理上一步
  const handleBack = useCallback(async () => {
    try {
      await previousStep();
    } catch (error) {
      console.error('Failed to go back to previous step:', error);
    }
  }, [previousStep]);

  // 处理跳过步骤
  const handleSkip = useCallback(async () => {
    try {
      await skipStep();
    } catch (error) {
      console.error('Failed to skip step:', error);
    }
  }, [skipStep]);

  // 处理步骤切换时的清理工作和backdrop-filter修复
  useEffect(() => {
    if (currentStep?.id !== previousStepRef.current) {
      // 清理之前的高亮
      const previousHighlight = document.querySelector('.onboarding-highlight');
      if (previousHighlight) {
        previousHighlight.classList.remove('onboarding-highlight');
        previousHighlight.removeAttribute('data-onboarding-active');
      }
      
      previousStepRef.current = currentStep?.id || null;
    }

    // 在指导激活时添加特殊类来禁用backdrop-filter
    if (isActive) {
      console.log('[OnboardingRenderer] Adding onboarding-active class to body to disable backdrop-filter');
      document.body.classList.add('onboarding-active');
      
      // 强制所有backdrop-filter元素失效
      const backdropElements = document.querySelectorAll('[class*="backdrop-blur"], [style*="backdrop-filter"]');
      console.log('[OnboardingRenderer] Found backdrop-filter elements:', backdropElements.length);
      
      return () => {
        console.log('[OnboardingRenderer] Removing onboarding-active class from body');
        document.body.classList.remove('onboarding-active');
      };
    }
  }, [currentStep?.id, isActive]);

  // 处理自动步骤
  useEffect(() => {
    console.log('[OnboardingRenderer] Auto step effect triggered:', {
      currentStepId: currentStep?.id,
      currentStepType: currentStep?.type,
      hasAction: !!currentStep?.action,
      actionType: currentStep?.action?.type,
      actionTarget: currentStep?.action?.target
    });

    if (currentStep && currentStep.type === 'auto' && currentStep.action) {
      console.log(`[OnboardingRenderer] Detected auto step, executing action: ${currentStep.id}`);
      
      const executeAutoAction = async () => {
        try {
          console.log('[OnboardingRenderer] Starting auto action execution');
          await executeStepAction(currentStep);
          console.log('[OnboardingRenderer] Auto action completed, proceeding to next step');
          
          // 自动进入下一步 - 给用户更多时间看到页面切换
          setTimeout(() => {
            console.log('[OnboardingRenderer] Auto advancing to next step');
            handleNext();
          }, 2500); // 进一步增加延迟时间
        } catch (error) {
          console.error('[OnboardingRenderer] Error executing auto step action:', error);
        }
      };

      // 延迟一小段时间确保组件已挂载
      console.log('[OnboardingRenderer] Scheduling auto action execution');
      setTimeout(executeAutoAction, 100);
    } else {
      console.log('[OnboardingRenderer] Not an auto step or missing action');
    }
  }, [currentStep?.id, currentStep?.type, executeStepAction, handleNext]);

  // 计算当前步骤索引
  const currentStepIndex = currentFlow?.steps.findIndex(s => s.id === currentStep?.id) ?? 0;
  const totalSteps = currentFlow?.steps.length ?? 0;

  // 获取进度条位置样式
  const getProgressPositionClass = () => {
    switch (progressPosition) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  // 如果指导未激活或没有当前步骤，不渲染
  if (!isActive || !currentFlow || !currentStep || !progress) {
    return null;
  }

  const targetElement = getTargetElement();

  return createPortal(
    <div
      ref={containerRef}
      className={`onboarding-renderer ${className}`}
      role="application"
      aria-label="用户指导系统"
    >
      {/* 遮罩层 - 使用原生DOM操作版本 */}
      <OnboardingOverlayNative
        targetElement={targetElement || undefined}
        config={config.overlay}
        onClick={config.overlay.clickToClose ? handleClose : undefined}
      />

      {/* 进度指示器 */}
      {showProgress && config.showProgress && (
        <div
          className={`fixed z-50 ${getProgressPositionClass()}`}
          style={{ maxWidth: '320px' }}
        >
          <div className="bg-base-100 rounded-xl shadow-lg border border-base-300/50 p-4">
            <OnboardingProgress
              flow={currentFlow}
              progress={progress}
              showStepNames={false}
              orientation="horizontal"
              size="sm"
            />
          </div>
        </div>
      )}

      {/* 主要指导组件 - 自动步骤不显示工具提示 */}
      {currentStep.type !== 'auto' && (
        <OnboardingTooltip
          step={currentStep}
          onNext={handleNext}
          onSkip={handleSkip}
          onBack={handleBack}
          onClose={handleClose}
          canSkip={canSkip()}
          canGoBack={canGoBack()}
          stepIndex={currentStepIndex}
          totalSteps={totalSteps}
        />
      )}

      {/* 自动步骤显示加载提示 */}
      {currentStep.type === 'auto' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20">
          <div className="bg-base-100 rounded-xl shadow-2xl p-8 max-w-lg mx-4 text-center border border-primary/20">
            <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
            <h3 className="font-bold text-xl mb-3 text-primary">{currentStep.title}</h3>
            <p className="text-base-content/80 mb-4">{currentStep.description}</p>
            {currentStep.action?.type === 'navigate' && (
              <div className="bg-primary/10 rounded-lg p-3 mt-4">
                <div className="text-xs text-primary/70 mb-1">正在跳转到</div>
                <div className="font-mono text-sm text-primary">{currentStep.action.target}</div>
              </div>
            )}
            <div className="text-xs text-base-content/50 mt-4">
              请稍候，系统正在自动执行操作...
            </div>
          </div>
        </div>
      )}

      {/* CSS样式 */}
      <style dangerouslySetInnerHTML={{
        __html: `
        /* 高亮目标元素的样式 */
        .onboarding-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px hsl(var(--p) / 0.3),
                      0 0 20px hsl(var(--p) / 0.2),
                      0 0 40px hsl(var(--p) / 0.1);
          border-radius: 0.5rem;
          transition: all 0.3s ease-out;
        }

        .onboarding-highlight::before {
          content: '';
          position: absolute;
          inset: -4px;
          border: 2px solid hsl(var(--p));
          border-radius: 0.625rem;
          pointer-events: none;
          animation: onboarding-pulse 2s ease-in-out infinite;
        }

        @keyframes onboarding-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.02);
          }
        }

        /* 工具提示动画 */
        .onboarding-tooltip {
          animation: onboarding-tooltip-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .onboarding-tooltip-hidden {
          opacity: 0;
          transform: scale(0.95) translateY(10px);
        }

        .onboarding-tooltip-visible {
          opacity: 1;
          transform: scale(1) translateY(0);
        }

        @keyframes onboarding-tooltip-enter {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* 遮罩层动画 */
        .onboarding-overlay {
          animation: onboarding-overlay-enter 0.3s ease-out forwards;
        }

        @keyframes onboarding-overlay-enter {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* 箭头样式 */
        .onboarding-arrow {
          width: 12px;
          height: 12px;
          background: hsl(var(--b1));
          border: 1px solid hsl(var(--b3) / 0.5);
          transform: rotate(45deg);
        }

        .onboarding-arrow-top {
          top: -6px;
          left: 50%;
          margin-left: -6px;
          border-bottom: none;
          border-right: none;
        }

        .onboarding-arrow-bottom {
          bottom: -6px;
          left: 50%;
          margin-left: -6px;
          border-top: none;
          border-left: none;
        }

        .onboarding-arrow-left {
          left: -6px;
          top: 50%;
          margin-top: -6px;
          border-right: none;
          border-bottom: none;
        }

        .onboarding-arrow-right {
          right: -6px;
          top: 50%;
          margin-top: -6px;
          border-left: none;
          border-top: none;
        }

        /* 禁用滚动以防止布局变化 */
        body.onboarding-active {
          overflow: hidden;
        }

        /* 修复backdrop-filter导致的模糊问题 */
        .onboarding-renderer ~ * [class*="backdrop-blur"],
        .onboarding-renderer ~ * [style*="backdrop-filter"] {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* 在指导激活时禁用所有backdrop-filter */
        body:has(.onboarding-renderer) [class*="backdrop-blur"],
        body:has(.onboarding-renderer) [style*="backdrop-filter"] {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* 特定组件的backdrop-filter修复 */
        body:has(.onboarding-renderer) .bg-base-100\\/80,
        body:has(.onboarding-renderer) .bg-base-100\\/95,
        body:has(.onboarding-renderer) .bg-black\\/40,
        body:has(.onboarding-renderer) .bg-black\\/50 {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* 响应式调整 */
        @media (max-width: 768px) {
          .onboarding-tooltip {
            max-width: calc(100vw - 2rem);
            margin: 0 1rem;
          }
          
          .onboarding-highlight {
            box-shadow: 0 0 0 2px hsl(var(--p) / 0.4),
                        0 0 10px hsl(var(--p) / 0.2);
          }
        }

        /* 无障碍访问增强 */
        @media (prefers-reduced-motion: reduce) {
          .onboarding-highlight::before,
          .onboarding-tooltip,
          .onboarding-overlay {
            animation: none !important;
          }
          
          .onboarding-highlight {
            transition: none !important;
          }
        }
        `
      }} />
    </div>,
    document.body
  );
};