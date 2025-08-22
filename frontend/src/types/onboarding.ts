/**
 * 新用户指导系统类型定义
 * 
 * 设计原则：
 * 1. 类型安全 - 完整的TypeScript支持
 * 2. 可扩展 - 支持不同类型的步骤和交互
 * 3. 国际化 - 内置多语言支持
 * 4. 可定制 - 支持主题和样式定制
 */

// 指导步骤的基础接口
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content?: string;
  targetElement?: string; // CSS选择器
  position?: TooltipPosition;
  type?: StepType;
  action?: StepAction;
  validation?: StepValidation;
  nextCondition?: NextCondition;
  skipCondition?: SkipCondition;
  metadata?: Record<string, any>;
}

// 指导流程定义
export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  version?: string;
  steps: OnboardingStep[];
  config?: FlowConfig;
  prerequisites?: Prerequisite[];
  permissions?: string[];
  category?: FlowCategory;
}

// 提示框位置
export type TooltipPosition = 
  | 'top' | 'top-start' | 'top-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end'
  | 'right' | 'right-start' | 'right-end'
  | 'center';

// 步骤类型
export type StepType = 
  | 'tooltip'        // 普通提示
  | 'modal'          // 模态框
  | 'highlight'      // 高亮元素
  | 'interactive'    // 交互式引导
  | 'form'           // 表单填写
  | 'wait'           // 等待用户操作
  | 'auto'           // 自动执行
  | 'quiz'           // 知识测试
  | 'intro'          // 介绍步骤
  | 'info';          // 信息展示

// 步骤行为
export interface StepAction {
  type: 'click' | 'navigate' | 'form' | 'wait' | 'custom';
  target?: string;
  data?: any;
  timeout?: number;
  retries?: number;
}

// 步骤验证
export interface StepValidation {
  type: 'element-exists' | 'element-visible' | 'value-equals' | 'custom';
  target?: string;
  expectedValue?: any;
  validator?: (context: OnboardingContext) => boolean;
  errorMessage?: string;
}

// 下一步条件
export interface NextCondition {
  type: 'auto' | 'click' | 'form-valid' | 'element-change' | 'custom';
  target?: string;
  condition?: (context: OnboardingContext) => boolean;
  timeout?: number;
}

// 跳过条件
export interface SkipCondition {
  type: 'permission' | 'data-exists' | 'feature-flag' | 'custom';
  condition: (context: OnboardingContext) => boolean;
  reason?: string;
}

// 流程配置
export interface FlowConfig {
  allowSkip: boolean;
  allowRestart: boolean;
  autoProgress: boolean;
  showProgress: boolean;
  showStepCounter: boolean;
  overlay: OverlayConfig;
  theme: ThemeConfig;
  responsive: ResponsiveConfig;
}

// 遮罩配置
export interface OverlayConfig {
  enabled: boolean;
  opacity: number;
  color: string;
  clickToClose: boolean;
  blur: boolean;
}

// 主题配置
export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  borderRadius: string;
  fontSize: FontSizeConfig;
  spacing: SpacingConfig;
}

export interface FontSizeConfig {
  title: string;
  body: string;
  caption: string;
}

export interface SpacingConfig {
  padding: string;
  margin: string;
  gap: string;
}

// 响应式配置
export interface ResponsiveConfig {
  mobile: Partial<FlowConfig>;
  tablet: Partial<FlowConfig>;
  desktop: Partial<FlowConfig>;
}

// 先决条件
export interface Prerequisite {
  type: 'auth' | 'permission' | 'feature' | 'data' | 'custom';
  value: any;
  validator?: (context: OnboardingContext) => boolean;
}

// 流程分类
export type FlowCategory = 
  | 'getting-started'   // 新用户入门
  | 'feature-intro'     // 功能介绍
  | 'workflow'          // 工作流程
  | 'troubleshooting'   // 问题排查
  | 'advanced'          // 高级功能
  | 'maintenance';      // 维护操作

// 指导状态
export type OnboardingStatus = 
  | 'not-started'       // 未开始
  | 'in-progress'       // 进行中
  | 'completed'         // 已完成
  | 'skipped'           // 已跳过
  | 'failed'            // 失败
  | 'paused';           // 暂停

// 步骤状态
export type StepStatus = 
  | 'pending'           // 待执行
  | 'active'            // 当前步骤
  | 'completed'         // 已完成
  | 'skipped'           // 已跳过
  | 'error';            // 错误

// 用户进度
export interface UserProgress {
  flowId: string;
  currentStepId?: string;
  completedSteps: string[];
  skippedSteps: string[];
  status: OnboardingStatus;
  startedAt: Date;
  completedAt?: Date;
  lastActiveAt: Date;
  metadata?: Record<string, any>;
}

// 指导上下文
export interface OnboardingContext {
  user: any; // 用户信息
  permissions: string[]; // 用户权限
  features: Record<string, boolean>; // 功能开关
  data: Record<string, any>; // 业务数据
  ui: UIContext; // UI状态
  flow: OnboardingFlow; // 当前流程
  progress: UserProgress; // 用户进度
}

export interface UIContext {
  currentPath: string;
  viewport: ViewportSize;
  theme: string;
  language: string;
  isTouch: boolean;
}

export interface ViewportSize {
  width: number;
  height: number;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

// 事件类型
export type OnboardingEvent = 
  | 'flow-started'
  | 'flow-completed'
  | 'flow-skipped'
  | 'flow-failed'
  | 'step-entered'
  | 'step-completed'
  | 'step-skipped'
  | 'step-failed'
  | 'validation-failed'
  | 'timeout-reached';

// 事件处理器
export interface OnboardingEventHandler {
  event: OnboardingEvent;
  handler: (context: OnboardingContext, data?: any) => void | Promise<void>;
}

// Hook返回类型
export interface UseOnboardingReturn {
  // 状态
  currentFlow: OnboardingFlow | null;
  currentStep: OnboardingStep | null;
  progress: UserProgress | null;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 操作
  startFlow: (flowId: string) => Promise<void>;
  nextStep: () => Promise<void>;
  previousStep: () => Promise<void>;
  skipStep: () => Promise<void>;
  completeFlow: () => Promise<void>;
  pauseFlow: () => Promise<void>;
  resumeFlow: () => Promise<void>;
  resetFlow: () => Promise<void>;
  
  // 工具函数
  canSkip: () => boolean;
  canGoBack: () => boolean;
  getStepProgress: () => number;
  getTotalProgress: () => number;
}

// 组件Props类型
export interface OnboardingProviderProps {
  children: React.ReactNode;
  config?: Partial<FlowConfig>;
  eventHandlers?: OnboardingEventHandler[];
  analytics?: boolean;
}

export interface OnboardingTooltipProps {
  step: OnboardingStep;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
  onClose: () => void;
  canSkip: boolean;
  canGoBack: boolean;
  stepIndex: number;
  totalSteps: number;
  className?: string;
}

export interface OnboardingProgressProps {
  flow: OnboardingFlow;
  progress: UserProgress;
  showStepNames?: boolean;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface OnboardingOverlayProps {
  targetElement?: Element;
  config: OverlayConfig;
  onClick?: () => void;
  className?: string;
}