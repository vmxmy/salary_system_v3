// Design effects for consistent UI styling using DaisyUI classes

export const cardEffects = {
  default: "card bg-base-100 shadow-sm",
  elevated: "card bg-base-100 shadow-lg",
  bordered: "card bg-base-100 shadow-sm border border-base-300",
  compact: "card bg-base-100 shadow-sm card-compact",
  glass: "card bg-base-100/80 backdrop-blur shadow-lg",
  hover: "card bg-base-100 shadow-sm hover:shadow-md transition-shadow duration-200",
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