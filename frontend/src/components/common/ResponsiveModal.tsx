import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { EnhancedModal } from './EnhancedModal';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  
  // Responsive configuration
  desktopSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  mobileFullscreen?: boolean;
  
  // Header configuration
  title?: string;
  subtitle?: string;
  headerIcon?: ReactNode;
  
  // Layout configuration
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  
  // Footer configuration
  footer?: ReactNode;
  
  // Behavior
  adaptiveHeight?: boolean;
}

export function ResponsiveModal({
  open,
  onClose,
  children,
  desktopSize = 'lg',
  mobileFullscreen = true,
  title,
  subtitle,
  headerIcon,
  variant = 'default',
  footer,
  adaptiveHeight = true,
}: ResponsiveModalProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  // Dynamic size based on screen size
  const getModalSize = () => {
    if (isMobile && mobileFullscreen) return 'full';
    if (isTablet) return 'lg';
    return desktopSize;
  };

  // Dynamic max height based on device
  const getMaxHeight = () => {
    if (isMobile) return adaptiveHeight ? 'screen' : 'default';
    return 'default';
  };

  return (
    <EnhancedModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      headerIcon={headerIcon}
      variant={variant}
      size={getModalSize()}
      maxHeight={getMaxHeight()}
      footer={footer}
      backdrop={isMobile ? 'dark' : 'blur'}
      animationDuration={isMobile ? 'fast' : 'normal'}
    >
      {/* Mobile-optimized content wrapper */}
      <div className={isMobile ? 'space-y-4' : 'space-y-6'}>
        {children}
      </div>
    </EnhancedModal>
  );
}

// Tabbed Modal for Complex Forms
interface TabbedModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tabs: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    content: ReactNode;
    disabled?: boolean;
  }>;
  defaultTab?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  footer?: ReactNode;
}

export function TabbedModal({
  open,
  onClose,
  title,
  tabs,
  defaultTab,
  variant = 'default',
  footer,
}: TabbedModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (open && !activeTab) {
      setActiveTab(tabs[0]?.id);
    }
  }, [open, activeTab, tabs]);

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={title}
      variant={variant}
      desktopSize="xl"
      footer={footer}
    >
      <div className="flex flex-col h-full">
        {/* Tab Navigation */}
        <div className="flex-shrink-0 mb-6">
          <div className={`tabs tabs-bordered ${isMobile ? 'tabs-sm' : ''}`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'tab-active' : ''} ${
                  tab.disabled ? 'tab-disabled' : ''
                } ${isMobile ? 'text-sm' : ''}`}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
              >
                {tab.icon && (
                  <span className="mr-2">{tab.icon}</span>
                )}
                <span className={isMobile ? 'hidden sm:inline' : ''}>
                  {tab.label}
                </span>
                {isMobile && (
                  <span className="sm:hidden">
                    {tab.label.split(' ')[0]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0">
          <div className="h-full overflow-y-auto">
            {activeTabContent}
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}

// Stepper Modal for Multi-step Processes
interface StepperModalProps {
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
  }>;
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function StepperModal({
  open,
  onClose,
  title,
  steps,
  currentStep,
  onStepChange,
  onComplete,
  variant = 'default',
}: StepperModalProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={title}
      variant={variant}
      desktopSize="xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-base-content/60">
            步骤 {currentStep + 1} / {steps.length}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handlePrevious}
              disabled={currentStep === 0 || !currentStepData?.canPrevious}
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
        {/* Stepper Progress */}
        <div className="w-full">
          <ul className={`steps w-full ${isMobile ? 'steps-vertical' : 'steps-horizontal'}`}>
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={`step ${index <= currentStep ? 'step-primary' : ''}`}
              >
                <div className="text-left">
                  <div className="font-medium text-sm">{step.title}</div>
                  {step.description && !isMobile && (
                    <div className="text-xs text-base-content/60 mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Current Step Content */}
        <div className="flex-1">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-base-content">
              {currentStepData?.title}
            </h3>
            {currentStepData?.description && (
              <p className="text-sm text-base-content/60 mt-1">
                {currentStepData.description}
              </p>
            )}
          </div>
          
          <div className="space-y-4">
            {currentStepData?.content}
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}