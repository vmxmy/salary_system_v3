/**
 * 新用户指导系统上下文
 * 
 * 核心功能：
 * 1. 状态管理 - 管理指导流程和用户进度
 * 2. 事件处理 - 处理步骤切换和验证
 * 3. 数据持久化 - 保存用户进度到localStorage
 * 4. 权限检查 - 基于用户权限控制指导内容
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useTranslation } from 'react-i18next';
import { availableOnboardingFlows, getAvailableFlows as getAvailableFlowsConfig } from '@/config/onboardingFlows';
import type {
  OnboardingFlow,
  OnboardingStep,
  UserProgress,
  OnboardingStatus,
  OnboardingContext as OnboardingCtx,
  OnboardingEvent,
  OnboardingEventHandler,
  FlowConfig,
  UseOnboardingReturn,
  OnboardingProviderProps
} from '@/types/onboarding';

// 默认配置
const DEFAULT_CONFIG: FlowConfig = {
  allowSkip: true,
  allowRestart: true,
  autoProgress: false,
  showProgress: true,
  showStepCounter: true,
  overlay: {
    enabled: true,
    opacity: 0.5,
    color: 'rgba(0, 0, 0, 0.6)',
    clickToClose: false,
    blur: false
  },
  theme: {
    primary: 'hsl(var(--p))',
    secondary: 'hsl(var(--s))',
    accent: 'hsl(var(--a))',
    background: 'hsl(var(--b1))',
    surface: 'hsl(var(--b2))',
    text: 'hsl(var(--bc))',
    borderRadius: '0.5rem',
    fontSize: {
      title: '1.125rem',
      body: '0.875rem',
      caption: '0.75rem'
    },
    spacing: {
      padding: '1rem',
      margin: '0.5rem',
      gap: '0.75rem'
    }
  },
  responsive: {
    mobile: {
      overlay: { 
        enabled: true,
        opacity: 0.6,
        color: 'rgba(0, 0, 0, 0.6)',
        clickToClose: false,
        blur: false
      },
      showStepCounter: false
    },
    tablet: {},
    desktop: {}
  }
};

// 上下文接口
interface OnboardingContextType extends UseOnboardingReturn {
  config: FlowConfig;
  context: OnboardingCtx | null;
  addEventListener: (handler: OnboardingEventHandler) => () => void;
  getAvailableFlows: () => OnboardingFlow[];
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ 
  children, 
  config: userConfig,
  eventHandlers = [],
  analytics = false 
}: OnboardingProviderProps) => {
  const { user, hasPermission } = useUnifiedAuth();
  const { i18n } = useTranslation();
  
  // 合并配置
  const config = useMemo(() => {
    const mergedConfig = {
      ...DEFAULT_CONFIG,
      ...userConfig
    };
    console.log(`[OnboardingContext] Config merged:`, {
      defaultConfig: DEFAULT_CONFIG,
      userConfig,
      mergedConfig,
      overlayConfig: mergedConfig.overlay
    });
    return mergedConfig;
  }, [userConfig]);

  // 状态管理
  const [currentFlow, setCurrentFlow] = useState<OnboardingFlow | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventListeners, setEventListeners] = useState<OnboardingEventHandler[]>(eventHandlers);

  // 获取视口信息
  const getViewportInfo = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    let breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    
    if (width < 768) breakpoint = 'mobile';
    else if (width < 1024) breakpoint = 'tablet';
    
    return { width, height, breakpoint };
  }, []);

  // 构建指导上下文
  const buildContext = useCallback((flow?: OnboardingFlow): OnboardingCtx | null => {
    if (!user) return null;
    
    const contextFlow = flow || currentFlow;
    const viewport = getViewportInfo();
    
    return {
      user,
      permissions: [...(user.permissions || [])],
      features: {}, // TODO: 从配置获取功能开关
      data: {}, // TODO: 从业务逻辑获取相关数据
      ui: {
        currentPath: window.location.pathname,
        viewport,
        theme: document.documentElement.getAttribute('data-theme') || 'cupcake',
        language: i18n.language,
        isTouch: 'ontouchstart' in window
      },
      flow: contextFlow!,
      progress: progress || {
        flowId: contextFlow?.id || 'unknown',
        completedSteps: [],
        skippedSteps: [],
        status: 'not-started' as OnboardingStatus,
        startedAt: new Date(),
        lastActiveAt: new Date()
      }
    };
  }, [currentFlow, user, progress, i18n.language, getViewportInfo]);

  // 触发事件
  const emitEvent = useCallback((event: OnboardingEvent, data?: any) => {
    const context = buildContext();
    if (!context) return;
    
    eventListeners.forEach(listener => {
      if (listener.event === event) {
        try {
          listener.handler(context, data);
        } catch (error) {
          console.error(`Error in onboarding event handler for ${event}:`, error);
        }
      }
    });
    
    // 分析追踪
    if (analytics) {
      console.log(`Onboarding Event: ${event}`, { context, data });
    }
  }, [eventListeners, buildContext, analytics]);

  // 存储进度到localStorage
  const saveProgress = useCallback((newProgress: UserProgress) => {
    try {
      const key = `onboarding_progress_${user?.id || 'anonymous'}_${newProgress.flowId}`;
      localStorage.setItem(key, JSON.stringify(newProgress));
    } catch (error) {
      console.warn('Failed to save onboarding progress:', error);
    }
  }, [user?.id]);

  // 从localStorage加载进度
  const loadProgress = useCallback((flowId: string): UserProgress | null => {
    try {
      const key = `onboarding_progress_${user?.id || 'anonymous'}_${flowId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load onboarding progress:', error);
      return null;
    }
  }, [user?.id]);

  // 检查先决条件
  const checkPrerequisites = useCallback((flow: OnboardingFlow): boolean => {
    if (!flow.prerequisites || flow.prerequisites.length === 0) return true;
    
    const context = buildContext(flow);
    if (!context) return false;
    
    return flow.prerequisites.every(prerequisite => {
      switch (prerequisite.type) {
        case 'auth':
          return !!user;
        case 'permission':
          return hasPermission(prerequisite.value);
        case 'feature':
          return context.features[prerequisite.value] === true;
        case 'data':
          return !!context.data[prerequisite.value];
        case 'custom':
          return prerequisite.validator ? prerequisite.validator(context) : true;
        default:
          return true;
      }
    });
  }, [buildContext, user, hasPermission]);

  // 开始指导流程
  const startFlow = useCallback(async (flowId: string) => {
    console.log(`[OnboardingContext] Starting flow: ${flowId}`);
    setIsLoading(true);
    setError(null);
    
    try {
      // 这里应该从API或本地存储加载流程
      // 现在先使用模拟数据
      const flow = availableOnboardingFlows.find(f => f.id === flowId);
      console.log(`[OnboardingContext] Found flow:`, flow);
      
      if (!flow) {
        throw new Error(`Flow not found: ${flowId}`);
      }
      
      // 检查先决条件
      const prerequisitesMet = checkPrerequisites(flow);
      console.log(`[OnboardingContext] Prerequisites check:`, { flowId, prerequisitesMet, flow });
      
      if (!prerequisitesMet) {
        throw new Error('Prerequisites not met for this flow');
      }
      
      // 加载或创建进度
      let userProgress = loadProgress(flowId);
      if (!userProgress) {
        userProgress = {
          flowId,
          completedSteps: [],
          skippedSteps: [],
          status: 'not-started',
          startedAt: new Date(),
          lastActiveAt: new Date()
        };
      }
      
      // 找到当前步骤
      const currentStepIndex = userProgress.completedSteps.length;
      const step = flow.steps[currentStepIndex];
      
      console.log(`[OnboardingContext] Setting current step:`, {
        currentStepIndex,
        step,
        stepId: step?.id,
        stepType: step?.type,
        hasTargetElement: !!step?.targetElement,
        totalSteps: flow.steps.length,
        completedSteps: userProgress.completedSteps
      });
      
      if (!step) {
        console.error('[OnboardingContext] ERROR: step is undefined!', {
          currentStepIndex,
          totalSteps: flow.steps.length,
          flowSteps: flow.steps,
          completedSteps: userProgress.completedSteps
        });
        // 如果步骤为undefined，尝试使用第一个步骤
        const firstStep = flow.steps[0];
        console.log('[OnboardingContext] Fallback to first step:', firstStep);
        setCurrentFlow(flow);
        setCurrentStep(firstStep);
        setProgress({
          ...userProgress,
          completedSteps: [], // 重置已完成步骤
          currentStepId: firstStep?.id
        });
        setIsActive(true);
      } else {
        setCurrentFlow(flow);
        setCurrentStep(step);
        setProgress(userProgress);
        setIsActive(true);
      }
      
      // 更新状态为进行中
      const updatedProgress = {
        ...userProgress,
        status: 'in-progress' as OnboardingStatus,
        currentStepId: step?.id,
        lastActiveAt: new Date()
      };
      
      console.log(`[OnboardingContext] Updated progress:`, updatedProgress);
      
      setProgress(updatedProgress);
      saveProgress(updatedProgress);
      
      emitEvent('flow-started', { flowId, step });
      emitEvent('step-entered', { stepId: step?.id });
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to start onboarding flow:', err);
    } finally {
      setIsLoading(false);
    }
  }, [checkPrerequisites, loadProgress, saveProgress, emitEvent]);

  // 下一步
  const nextStep = useCallback(async () => {
    if (!currentFlow || !currentStep || !progress) {
      console.log('[OnboardingContext] nextStep called but missing required data:', {
        currentFlow: !!currentFlow,
        currentStep: !!currentStep,
        progress: !!progress
      });
      return;
    }
    
    const currentIndex = currentFlow.steps.findIndex(s => s.id === currentStep.id);
    const nextIndex = currentIndex + 1;
    
    console.log('[OnboardingContext] nextStep called:', {
      currentStepId: currentStep.id,
      currentIndex,
      nextIndex,
      totalSteps: currentFlow.steps.length
    });
    
    // 标记当前步骤为完成
    const updatedProgress = {
      ...progress,
      completedSteps: [...progress.completedSteps, currentStep.id],
      currentStepId: undefined,
      lastActiveAt: new Date()
    };
    
    emitEvent('step-completed', { stepId: currentStep.id });
    
    // 检查是否完成流程
    if (nextIndex >= currentFlow.steps.length) {
      updatedProgress.status = 'completed';
      updatedProgress.completedAt = new Date();
      
      setProgress(updatedProgress);
      saveProgress(updatedProgress);
      setIsActive(false);
      setCurrentStep(null);
      
      emitEvent('flow-completed', { flowId: currentFlow.id });
      return;
    }
    
    // 进入下一步
    const nextStep = currentFlow.steps[nextIndex];
    const finalProgress = {
      ...updatedProgress,
      currentStepId: nextStep?.id
    };
    
    setCurrentStep(nextStep);
    setProgress(finalProgress);
    saveProgress(finalProgress);
    
    emitEvent('step-entered', { stepId: nextStep.id });
  }, [currentFlow, currentStep, progress, saveProgress, emitEvent]);

  // 上一步
  const previousStep = useCallback(async () => {
    if (!currentFlow || !currentStep || !progress) return;
    
    const currentIndex = currentFlow.steps.findIndex(s => s.id === currentStep.id);
    if (currentIndex <= 0) return;
    
    const previousIndex = currentIndex - 1;
    const prevStep = currentFlow.steps[previousIndex];
    
    // 更新进度
    const updatedProgress = {
      ...progress,
      completedSteps: progress.completedSteps.filter(id => id !== prevStep.id),
      currentStepId: prevStep.id,
      lastActiveAt: new Date()
    };
    
    setCurrentStep(prevStep);
    setProgress(updatedProgress);
    saveProgress(updatedProgress);
    
    emitEvent('step-entered', { stepId: prevStep.id });
  }, [currentFlow, currentStep, progress, saveProgress, emitEvent]);

  // 跳过步骤
  const skipStep = useCallback(async () => {
    if (!currentFlow || !currentStep || !progress) return;
    
    const currentIndex = currentFlow.steps.findIndex(s => s.id === currentStep.id);
    const nextIndex = currentIndex + 1;
    
    // 标记当前步骤为跳过
    const updatedProgress = {
      ...progress,
      skippedSteps: [...progress.skippedSteps, currentStep.id],
      currentStepId: undefined,
      lastActiveAt: new Date()
    };
    
    emitEvent('step-skipped', { stepId: currentStep.id });
    
    // 检查是否完成流程
    if (nextIndex >= currentFlow.steps.length) {
      updatedProgress.status = 'completed';
      updatedProgress.completedAt = new Date();
      
      setProgress(updatedProgress);
      saveProgress(updatedProgress);
      setIsActive(false);
      setCurrentStep(null);
      
      emitEvent('flow-completed', { flowId: currentFlow.id });
      return;
    }
    
    // 进入下一步
    const nextStep = currentFlow.steps[nextIndex];
    const finalProgress = {
      ...updatedProgress,
      currentStepId: nextStep?.id
    };
    
    setCurrentStep(nextStep);
    setProgress(finalProgress);
    saveProgress(finalProgress);
    
    emitEvent('step-entered', { stepId: nextStep.id });
  }, [currentFlow, currentStep, progress, saveProgress, emitEvent]);

  // 完成流程
  const completeFlow = useCallback(async () => {
    if (!currentFlow || !progress) return;
    
    const updatedProgress = {
      ...progress,
      status: 'completed' as OnboardingStatus,
      completedAt: new Date(),
      lastActiveAt: new Date()
    };
    
    setProgress(updatedProgress);
    saveProgress(updatedProgress);
    setIsActive(false);
    setCurrentStep(null);
    
    emitEvent('flow-completed', { flowId: currentFlow.id });
  }, [currentFlow, progress, saveProgress, emitEvent]);

  // 暂停流程
  const pauseFlow = useCallback(async () => {
    if (!progress) return;
    
    const updatedProgress = {
      ...progress,
      status: 'paused' as OnboardingStatus,
      lastActiveAt: new Date()
    };
    
    setProgress(updatedProgress);
    saveProgress(updatedProgress);
    setIsActive(false);
  }, [progress, saveProgress]);

  // 恢复流程
  const resumeFlow = useCallback(async () => {
    if (!progress || !currentFlow) return;
    
    const updatedProgress = {
      ...progress,
      status: 'in-progress' as OnboardingStatus,
      lastActiveAt: new Date()
    };
    
    setProgress(updatedProgress);
    saveProgress(updatedProgress);
    setIsActive(true);
  }, [progress, currentFlow, saveProgress]);

  // 重置流程
  const resetFlow = useCallback(async () => {
    if (!currentFlow) return;
    
    const newProgress = {
      flowId: currentFlow.id,
      completedSteps: [],
      skippedSteps: [],
      status: 'not-started' as OnboardingStatus,
      startedAt: new Date(),
      lastActiveAt: new Date()
    };
    
    setProgress(newProgress);
    saveProgress(newProgress);
    setCurrentStep(currentFlow.steps[0]);
    setIsActive(true);
  }, [currentFlow, saveProgress]);

  // 工具函数
  const canSkip = useCallback(() => {
    return config.allowSkip && (!currentStep?.skipCondition || 
      currentStep.skipCondition.condition(buildContext()!));
  }, [config.allowSkip, currentStep, buildContext]);

  const canGoBack = useCallback(() => {
    if (!currentFlow || !progress) return false;
    const currentIndex = currentFlow.steps.findIndex(s => s.id === currentStep?.id);
    return currentIndex > 0;
  }, [currentFlow, currentStep, progress]);

  const getStepProgress = useCallback(() => {
    if (!currentFlow || !progress) return 0;
    const currentIndex = currentFlow.steps.findIndex(s => s.id === currentStep?.id);
    return currentIndex >= 0 ? (currentIndex / currentFlow.steps.length) * 100 : 0;
  }, [currentFlow, currentStep, progress]);

  const getTotalProgress = useCallback(() => {
    if (!currentFlow || !progress) return 0;
    const totalSteps = currentFlow.steps.length;
    const completedSteps = progress.completedSteps.length;
    return (completedSteps / totalSteps) * 100;
  }, [currentFlow, progress]);

  // 添加事件监听器
  const addEventListener = useCallback((handler: OnboardingEventHandler) => {
    setEventListeners(prev => [...prev, handler]);
    
    return () => {
      setEventListeners(prev => prev.filter(h => h !== handler));
    };
  }, []);


  // 获取可用流程
  const getAvailableFlows = useCallback(() => {
    const userPermissions = user?.permissions || [];
    return getAvailableFlowsConfig(userPermissions).filter(flow => checkPrerequisites(flow));
  }, [user?.permissions, checkPrerequisites]);

  const context = buildContext();

  const value: OnboardingContextType = useMemo(() => ({
    // 状态
    currentFlow,
    currentStep,
    progress,
    isActive,
    isLoading,
    error,
    config,
    context,
    
    // 操作
    startFlow,
    nextStep,
    previousStep,
    skipStep,
    completeFlow,
    pauseFlow,
    resumeFlow,
    resetFlow,
    
    // 工具函数
    canSkip,
    canGoBack,
    getStepProgress,
    getTotalProgress,
    addEventListener,
    getAvailableFlows
  }), [
    currentFlow,
    currentStep,
    progress,
    isActive,
    isLoading,
    error,
    config,
    context,
    startFlow,
    nextStep,
    previousStep,
    skipStep,
    completeFlow,
    pauseFlow,
    resumeFlow,
    resetFlow,
    canSkip,
    canGoBack,
    getStepProgress,
    getTotalProgress,
    addEventListener,
    getAvailableFlows
  ]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

// 注意：指导流程现在从 @/config/onboardingFlows 导入
// 这样可以更好地管理和维护流程配置