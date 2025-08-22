/**
 * 新用户指导工具提示组件
 * 
 * 特性：
 * 1. 响应式定位 - 根据目标元素自动调整位置
 * 2. 平滑动画 - 优雅的进入和离开动画
 * 3. 键盘导航 - 支持ESC键关闭，方向键导航
 * 4. 无障碍访问 - 完整的ARIA属性支持
 * 5. 主题适配 - 自动适配DaisyUI主题
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeftIcon, 
  ArrowRightIcon, 
  XMarkIcon,
  CheckIcon,
  ForwardIcon
} from '@heroicons/react/24/outline';
import type { OnboardingTooltipProps } from '@/types/onboarding';

export const OnboardingTooltip = ({
  step,
  onNext,
  onSkip,
  onBack,
  onClose,
  canSkip,
  canGoBack,
  stepIndex,
  totalSteps,
  className = ''
}: OnboardingTooltipProps) => {
  const { t } = useTranslation('onboarding');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [isVisible, setIsVisible] = useState(false);

  // 计算最佳位置
  const calculatePosition = useCallback(() => {
    if (!step.targetElement || !tooltipRef.current) return;

    const targetEl = document.querySelector(step.targetElement);
    if (!targetEl) return;

    const targetRect = targetEl.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spacing = 16; // 间距
    let x = 0;
    let y = 0;
    let arrow: 'top' | 'bottom' | 'left' | 'right' = 'top';

    // 根据指定位置或自动计算最佳位置
    const preferredPosition = step.position || 'auto';

    if (preferredPosition === 'auto') {
      // 自动选择最佳位置
      const spaceTop = targetRect.top;
      const spaceBottom = viewportHeight - targetRect.bottom;
      const spaceLeft = targetRect.left;
      const spaceRight = viewportWidth - targetRect.right;

      if (spaceBottom >= tooltipRect.height + spacing) {
        // 底部有足够空间
        y = targetRect.bottom + spacing;
        x = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        arrow = 'top';
      } else if (spaceTop >= tooltipRect.height + spacing) {
        // 顶部有足够空间
        y = targetRect.top - tooltipRect.height - spacing;
        x = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        arrow = 'bottom';
      } else if (spaceRight >= tooltipRect.width + spacing) {
        // 右侧有足够空间
        x = targetRect.right + spacing;
        y = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        arrow = 'left';
      } else if (spaceLeft >= tooltipRect.width + spacing) {
        // 左侧有足够空间
        x = targetRect.left - tooltipRect.width - spacing;
        y = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        arrow = 'right';
      } else {
        // 居中显示
        x = (viewportWidth - tooltipRect.width) / 2;
        y = (viewportHeight - tooltipRect.height) / 2;
        arrow = 'top';
      }
    } else {
      // 按照指定位置计算
      switch (preferredPosition) {
        case 'top':
          x = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          y = targetRect.top - tooltipRect.height - spacing;
          arrow = 'bottom';
          break;
        case 'bottom':
          x = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          y = targetRect.bottom + spacing;
          arrow = 'top';
          break;
        case 'left':
          x = targetRect.left - tooltipRect.width - spacing;
          y = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          arrow = 'right';
          break;
        case 'right':
          x = targetRect.right + spacing;
          y = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          arrow = 'left';
          break;
        case 'center':
          x = (viewportWidth - tooltipRect.width) / 2;
          y = (viewportHeight - tooltipRect.height) / 2;
          arrow = 'top';
          break;
      }
    }

    // 确保工具提示在视口内
    x = Math.max(spacing, Math.min(x, viewportWidth - tooltipRect.width - spacing));
    y = Math.max(spacing, Math.min(y, viewportHeight - tooltipRect.height - spacing));

    setPosition({ x, y });
    setArrowPosition(arrow);
  }, [step.targetElement, step.position]);

  // 高亮目标元素
  const highlightTarget = useCallback(() => {
    if (!step.targetElement) return;

    const targetEl = document.querySelector(step.targetElement);
    if (targetEl) {
      targetEl.classList.add('onboarding-highlight');
      targetEl.setAttribute('data-onboarding-active', 'true');
      
      // 滚动到视图中
      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }, [step.targetElement]);

  // 清除高亮
  const clearHighlight = useCallback(() => {
    const activeEl = document.querySelector('[data-onboarding-active="true"]');
    if (activeEl) {
      activeEl.classList.remove('onboarding-highlight');
      activeEl.removeAttribute('data-onboarding-active');
    }
  }, []);

  // 键盘事件处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowRight':
      case 'Enter':
        e.preventDefault();
        onNext();
        break;
      case 'ArrowLeft':
        if (canGoBack) {
          e.preventDefault();
          onBack();
        }
        break;
      case 'Tab':
        if (e.shiftKey && canSkip) {
          e.preventDefault();
          onSkip();
        }
        break;
    }
  }, [onNext, onBack, onSkip, onClose, canGoBack, canSkip]);

  // 初始化和清理
  useEffect(() => {
    highlightTarget();
    calculatePosition();
    setIsVisible(true);

    // 监听窗口大小变化
    const handleResize = () => {
      calculatePosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', calculatePosition);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearHighlight();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', calculatePosition);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [highlightTarget, calculatePosition, clearHighlight, handleKeyDown]);

  // 如果是居中模态框模式，不需要定位
  const isModalMode = step.type === 'modal' || step.position === 'center';

  return (
    <>
      {/* 遮罩层 */}
      <div className="fixed inset-0 bg-black/40 z-50 onboarding-overlay" />
      
      {/* 工具提示 */}
      <div
        ref={tooltipRef}
        className={`fixed z-[60] onboarding-tooltip ${className} ${
          isVisible ? 'onboarding-tooltip-visible' : 'onboarding-tooltip-hidden'
        }`}
        style={
          isModalMode 
            ? { 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)'
              }
            : {
                top: position.y,
                left: position.x,
                transform: 'none'
              }
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
      >
        <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300/50 p-6 max-w-sm w-full mx-4">
          {/* 箭头指示器（非模态框模式） */}
          {!isModalMode && (
            <div
              className={`absolute onboarding-arrow onboarding-arrow-${arrowPosition}`}
              data-arrow={arrowPosition}
            />
          )}
          
          {/* 头部 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3
                id="onboarding-title"
                className="text-lg font-semibold text-base-content mb-1"
              >
                {step.title}
              </h3>
              {totalSteps > 1 && (
                <div className="text-xs text-base-content/60 font-medium">
                  {t('step', { current: stepIndex + 1, total: totalSteps })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle ml-2 opacity-60 hover:opacity-100"
              aria-label={t('close')}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* 进度条 */}
          {totalSteps > 1 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-base-content/60 mb-2">
                <span>{t('progress')}</span>
                <span>{Math.round(((stepIndex + 1) / totalSteps) * 100)}%</span>
              </div>
              <div className="w-full bg-base-300 rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all duration-500 ease-out"
                  style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* 内容 */}
          <div
            id="onboarding-description"
            className="text-sm text-base-content/80 mb-6 leading-relaxed"
          >
            {step.description}
            {step.content && (
              <div className="mt-3 p-3 bg-base-200/50 rounded-lg text-xs">
                {step.content}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {canGoBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="btn btn-ghost btn-sm"
                  aria-label={t('previous')}
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-1" />
                  {t('back')}
                </button>
              )}
              
              {canSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="btn btn-ghost btn-sm opacity-60 hover:opacity-100"
                >
                  {t('skip')}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onNext}
              className="btn btn-primary btn-sm px-4"
              autoFocus
            >
              {stepIndex === totalSteps - 1 ? (
                <>
                  <CheckIcon className="w-4 h-4 mr-1" />
                  {t('finish')}
                </>
              ) : (
                <>
                  {t('next')}
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>

          {/* 键盘提示 */}
          <div className="mt-4 text-xs text-base-content/50 text-center">
            {t('keyboardHint')}
          </div>
        </div>
      </div>
    </>
  );
};