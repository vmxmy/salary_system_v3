// Design effects for consistent UI styling using DaisyUI classes

// 统一的card边框和样式效果系统
// 基于DaisyUI v5的最佳实践，提供一致的边框样式

export const cardEffects = {
  // ==========================================
  // 统一主题色边框系统 - 基于DaisyUI v5 Primary色
  // 所有card使用primary主题色边框，通过透明度区分层次
  // ==========================================
  
  // 基础样式 - 使用primary/8提供统一的主题色边框基调
  default: "card bg-base-100 shadow-sm border border-primary/8",
  
  // 标准边框样式 - 增强primary/15，保持统一性
  standard: "card bg-base-100 shadow-sm border border-primary/15",
  
  // 强调边框样式 - primary/25，更明显但仍保持统一
  emphasized: "card bg-base-100 shadow-sm border border-primary/25",
  
  // 主题色边框 - 保持原有语义，但统一使用primary基调
  primary: "card bg-base-100 shadow-sm border border-primary/30",
  secondary: "card bg-base-100 shadow-sm border border-primary/20 ring-1 ring-secondary/10",
  accent: "card bg-base-100 shadow-sm border border-primary/20 ring-1 ring-accent/10",
  
  // 状态边框 - 保持状态色，但添加primary底色增强一致性
  success: "card bg-base-100 shadow-sm border border-success/25 ring-1 ring-primary/5",
  warning: "card bg-base-100 shadow-sm border border-warning/25 ring-1 ring-primary/5",
  error: "card bg-base-100 shadow-sm border border-error/25 ring-1 ring-primary/5",
  info: "card bg-base-100 shadow-sm border border-info/25 ring-1 ring-primary/5",
  
  // DaisyUI v5新特性 - 虚线边框
  dashed: "card bg-base-100 shadow-sm card-dash",
  
  // 升级版样式 - 统一使用primary主题色边框
  elevated: "card bg-base-100 shadow-lg border border-primary/12",
  compact: "card bg-base-100 shadow-sm card-sm border border-primary/8",
  glass: "card bg-base-100/80 backdrop-blur shadow-lg border border-primary/15",
  
  // 交互效果 - 统一的primary主题色hover增强
  hover: "card bg-base-100 shadow-sm border border-primary/8 hover:shadow-md hover:border-primary/20 transition-all duration-200",
  interactive: "card bg-base-100 shadow-sm border border-primary/8 hover:shadow-lg hover:border-primary/35 hover:scale-[1.02] transition-all duration-200",
  
  // 无边框版本 - 用于需要极简风格的场景（保持原样，作为对比选项）
  clean: "card bg-base-100 shadow-sm",
  floating: "card bg-base-100 shadow-lg",
  
  // ==========================================
  // 特殊用途的主题色边框变体
  // ==========================================
  
  // 渐变增强 - primary色渐变边框效果
  gradient: "card bg-base-100 shadow-sm border border-transparent bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 bg-clip-padding",
  
  // 脉动效果 - 用于需要注意力的card
  pulse: "card bg-base-100 shadow-sm border border-primary/15 animate-pulse",
  
  // 活跃状态 - 用于选中或活跃的card
  active: "card bg-base-100 shadow-lg border-2 border-primary/40 ring-2 ring-primary/10",
}

export const buttonEffects = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary", 
  accent: "btn btn-accent",
  ghost: "btn btn-ghost",
  outline: "btn btn-outline",
  success: "btn btn-success",
  warning: "btn btn-warning", 
  error: "btn btn-error",
  info: "btn btn-info",
  loading: "btn btn-primary loading",
  disabled: "btn btn-disabled",
  sm: "btn btn-sm",
  lg: "btn btn-lg",
  wide: "btn btn-wide",
  block: "btn btn-block",
  circle: "btn btn-circle",
  square: "btn btn-square",
}

export const inputEffects = {
  default: "input input-bordered w-full",
  primary: "input input-bordered input-primary w-full",
  secondary: "input input-bordered input-secondary w-full", 
  accent: "input input-bordered input-accent w-full",
  success: "input input-bordered input-success w-full",
  warning: "input input-bordered input-warning w-full",
  error: "input input-bordered input-error w-full",
  info: "input input-bordered input-info w-full",
  ghost: "input input-ghost w-full",
  sm: "input input-bordered input-sm w-full",
  lg: "input input-bordered input-lg w-full",
  disabled: "input input-bordered input-disabled w-full",
  focus: "input input-bordered w-full focus:input-primary",
}

export const badgeEffects = {
  default: "badge",
  primary: "badge badge-primary",
  secondary: "badge badge-secondary",
  accent: "badge badge-accent", 
  success: "badge badge-success",
  warning: "badge badge-warning",
  error: "badge badge-error",
  info: "badge badge-info",
  ghost: "badge badge-ghost",
  outline: "badge badge-outline",
  sm: "badge badge-sm",
  lg: "badge badge-lg",
}

export const alertEffects = {
  info: "alert alert-info",
  success: "alert alert-success", 
  warning: "alert alert-warning",
  error: "alert alert-error",
}

export const iconContainer = "flex items-center justify-center w-8 h-8 rounded-lg";