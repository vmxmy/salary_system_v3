import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ModernModal } from './ModernModalSystem';
import { cn } from '@/lib/utils';

// Tab导航模态框
interface TabModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  tabs: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    content: ReactNode;
    disabled?: boolean;
    badge?: string | number;
  }>;
  defaultTab?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  footer?: ReactNode;
  onTabChange?: (tabId: string) => void;
}

export function TabModal({
  open,
  onClose,
  title,
  subtitle,
  tabs,
  defaultTab,
  variant = 'default',
  footer,
  onTabChange
}: TabModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  useEffect(() => {
    if (open && !activeTab && tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
  }, [open, activeTab, tabs]);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  }, [onTabChange]);

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <ModernModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      variant={variant}
      size="xl"
      height="tall"
      footer={footer}
    >
      <div className="flex flex-col h-full min-h-[600px]">
        {/* 现代化Tab导航 */}
        <div className="flex-shrink-0 mb-6">
          <div className="relative">
            {/* Tab按钮组 */}
            <div className={cn(
              "flex flex-wrap gap-1 p-1 rounded-xl",
              "bg-base-200/50 border border-base-300/40"
            )}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-lg",
                    "text-sm font-medium transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50",
                    activeTab === tab.id ? [
                      "bg-base-100 text-base-content shadow-sm",
                      "border border-base-300/60"
                    ] : [
                      "text-base-content/70 hover:text-base-content",
                      "hover:bg-base-100/50"
                    ],
                    tab.disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !tab.disabled && handleTabChange(tab.id)}
                  disabled={tab.disabled}
                >
                  {/* 图标 */}
                  {tab.icon && (
                    <span className={cn(
                      "w-4 h-4 transition-colors",
                      activeTab === tab.id ? "text-primary" : "text-base-content/50"
                    )}>
                      {tab.icon}
                    </span>
                  )}
                  
                  {/* 标签文字 */}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  
                  {/* 徽章 */}
                  {tab.badge && (
                    <span className={cn(
                      "badge badge-sm ml-1",
                      activeTab === tab.id ? "badge-primary" : "badge-neutral"
                    )}>
                      {tab.badge}
                    </span>
                  )}
                  
                  {/* 活动指示器 */}
                  {activeTab === tab.id && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab内容区域 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className={cn(
              "animate-in fade-in slide-in-from-right-2 duration-200",
              "focus:outline-none"
            )}>
              {activeTabContent}
            </div>
          </div>
        </div>
      </div>
    </ModernModal>
  );
}

// 步骤式模态框
interface StepModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  steps: Array<{
    id: string;
    title: string;
    description?: string;
    content: ReactNode;
    canNext?: boolean;
    canPrevious?: boolean;
    optional?: boolean;
  }>;
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  showProgress?: boolean;
}

export function StepModal({
  open,
  onClose,
  title,
  steps,
  currentStep,
  onStepChange,
  onComplete,
  variant = 'default',
  showProgress = true
}: StepModalProps) {
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete?.();
    } else {
      onStepChange(currentStep + 1);
    }
  }, [isLastStep, onComplete, onStepChange, currentStep]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  }, [isFirstStep, onStepChange, currentStep]);

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <ModernModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={`步骤 ${currentStep + 1} / ${steps.length}`}
      variant={variant}
      size="xl"
      height="tall"
      footer={
        <div className="flex justify-between items-center w-full">
          {/* 进度信息 */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-base-content/60">
              {currentStepData?.title}
              {currentStepData?.optional && (
                <span className="badge badge-sm badge-ghost ml-2">可选</span>
              )}
            </div>
          </div>
          
          {/* 导航按钮 */}
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handlePrevious}
              disabled={isFirstStep || !currentStepData?.canPrevious}
            >
              上一步
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNext}
              disabled={!currentStepData?.canNext}
            >
              {isLastStep ? '完成' : '下一步'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 进度条 */}
        {showProgress && (
          <div className="space-y-4">
            {/* 线性进度条 */}
            <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            {/* 步骤指示器 */}
            <div className="hidden lg:block">
              <div className="flex justify-between">
                {steps.map((step, index) => (
                  <div 
                    key={step.id}
                    className={cn(
                      "flex flex-col items-center text-center max-w-[120px]",
                      "transition-all duration-200"
                    )}
                  >
                    {/* 步骤圆圈 */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      "text-sm font-medium transition-all duration-200",
                      index < currentStep && "bg-success text-success-content",
                      index === currentStep && "bg-primary text-primary-content ring-4 ring-primary/20",
                      index > currentStep && "bg-base-200 text-base-content/50"
                    )}>
                      {index < currentStep ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    {/* 步骤信息 */}
                    <div className="mt-2">
                      <div className={cn(
                        "text-xs font-medium",
                        index <= currentStep ? "text-base-content" : "text-base-content/50"
                      )}>
                        {step.title}
                      </div>
                      {step.optional && (
                        <div className="text-xs text-base-content/40 mt-1">
                          可选
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 当前步骤内容 */}
        <div className="flex-1">
          {/* 步骤标题 */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-base-content">
              {currentStepData?.title}
            </h3>
            {currentStepData?.description && (
              <p className="text-sm text-base-content/70 mt-2 leading-relaxed">
                {currentStepData.description}
              </p>
            )}
          </div>
          
          {/* 步骤内容 */}
          <div className={cn(
            "animate-in fade-in slide-in-from-right-2 duration-300",
            "focus:outline-none"
          )}>
            {currentStepData?.content}
          </div>
        </div>
      </div>
    </ModernModal>
  );
}

// 侧边栏模态框（用于筛选器和详情面板）
interface SideModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  side?: 'left' | 'right';
  width?: 'sm' | 'md' | 'lg' | 'xl';
  overlay?: boolean;
}

export function SideModal({
  open,
  onClose,
  children,
  title,
  subtitle,
  side = 'right',
  width = 'md',
  overlay = true
}: SideModalProps) {
  const widthClasses = {
    sm: 'w-80',
    md: 'w-96', 
    lg: 'w-[32rem]',
    xl: 'w-[40rem]'
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 背景遮罩 */}
      {overlay && (
        <div 
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-sm",
            "transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
          onClick={onClose}
        />
      )}
      
      {/* 侧边面板 */}
      <div className={cn(
        "relative z-10 h-full bg-base-100 shadow-2xl",
        "border-l border-base-300/60",
        "flex flex-col",
        widthClasses[width],
        side === 'left' ? "order-first border-r border-l-0" : "ml-auto",
        "transform transition-transform duration-300 ease-out",
        open ? "translate-x-0" : side === 'right' ? "translate-x-full" : "-translate-x-full"
      )}>
        {/* 侧边栏头部 */}
        {(title || subtitle) && (
          <div className="flex-shrink-0 px-6 py-4 border-b border-base-300/60">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2 className="text-lg font-semibold text-base-content truncate">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-sm text-base-content/60 mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-circle btn-ghost ml-4"
                onClick={onClose}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* 侧边栏内容 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}