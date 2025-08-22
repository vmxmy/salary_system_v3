/**
 * 新用户指导系统组件导出
 */

export { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
export { OnboardingRenderer } from './OnboardingRenderer';
export { OnboardingTooltip } from './OnboardingTooltip';
export { OnboardingOverlay } from './OnboardingOverlay';
export { OnboardingProgress } from './OnboardingProgress';
export { OnboardingLauncher } from './OnboardingLauncher';
export { OnboardingButton } from './OnboardingButton';
export { 
  PageOnboardingLauncher, 
  InlinePageOnboardingLauncher, 
  FloatingPageOnboardingLauncher 
} from './PageOnboardingLauncher';

// 类型导出
export type {
  OnboardingStep,
  OnboardingFlow,
  UserProgress,
  OnboardingContext,
  OnboardingStatus,
  StepStatus,
  StepType,
  FlowCategory,
  TooltipPosition,
  OnboardingTooltipProps,
  OnboardingOverlayProps,
  OnboardingProgressProps,
  OnboardingProviderProps,
  UseOnboardingReturn
} from '@/types/onboarding';