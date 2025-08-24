/**
 * 统一Avatar组件 - DaisyUI 5优化版本
 * 
 * 核心特性：
 * - 使用DaisyUI 5的正确语法 (avatar-placeholder)
 * - 支持多种尺寸和样式变体
 * - 内置居中逻辑，无需手动flex类
 * - 统一的配色和间距规范
 * 
 * @author Claude Code
 * @version 1.0
 */

import { type ReactNode } from 'react';

/**
 * Avatar尺寸配置
 */
export const AVATAR_SIZES = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8', 
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20'
} as const;

/**
 * Avatar文字尺寸配置
 */
export const AVATAR_TEXT_SIZES = {
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-sm', 
  lg: 'text-lg',
  xl: 'text-xl'
} as const;

/**
 * Avatar颜色主题配置
 */
export const AVATAR_THEMES = {
  primary: 'bg-primary text-primary-content',
  secondary: 'bg-secondary text-secondary-content', 
  accent: 'bg-accent text-accent-content',
  neutral: 'bg-neutral text-neutral-content',
  success: 'bg-success text-success-content',
  warning: 'bg-warning text-warning-content',
  error: 'bg-error text-error-content'
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;
export type AvatarTheme = keyof typeof AVATAR_THEMES;

/**
 * Avatar组件属性
 */
export interface AvatarProps {
  /** 显示的文字内容 */
  text?: string;
  /** 用户邮箱（用于提取首字母） */
  email?: string;
  /** 员工姓名（用于提取首字母） */
  employeeName?: string;
  /** Avatar尺寸 */
  size?: AvatarSize;
  /** 颜色主题 */
  theme?: AvatarTheme;
  /** 是否为圆形（默认true） */
  rounded?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 额外的内容 */
  children?: ReactNode;
  /** 点击事件 */
  onClick?: () => void;
}

/**
 * 提取显示文字的工具函数
 */
function extractDisplayText(text?: string, email?: string, employeeName?: string): string {
  if (text) return text.toUpperCase();
  if (employeeName) return employeeName.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return 'U';
}

/**
 * Avatar组件 - 统一的用户头像展示组件
 * 
 * 使用DaisyUI 5的最佳实践实现，确保文字完美居中
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <Avatar email="user@example.com" />
 * 
 * // 自定义尺寸和主题
 * <Avatar 
 *   employeeName="张三" 
 *   size="lg" 
 *   theme="success" 
 * />
 * 
 * // 可点击的头像
 * <Avatar 
 *   text="AD" 
 *   size="md"
 *   onClick={() => console.log('Avatar clicked')}
 * />
 * ```
 */
export function Avatar({
  text,
  email,
  employeeName, 
  size = 'md',
  theme = 'primary',
  rounded = true,
  className = '',
  children,
  onClick
}: AvatarProps) {
  const displayText = extractDisplayText(text, email, employeeName);
  const sizeClass = AVATAR_SIZES[size];
  const textSizeClass = AVATAR_TEXT_SIZES[size]; 
  const themeClass = AVATAR_THEMES[theme];
  const shapeClass = rounded ? 'rounded-full' : 'rounded-md';
  const cursorClass = onClick ? 'cursor-pointer' : '';
  
  return (
    <div className={`avatar avatar-placeholder ${className}`}>
      <div 
        className={`${themeClass} ${sizeClass} ${shapeClass} ${cursorClass}`}
        onClick={onClick}
      >
        {children || (
          <span className={`${textSizeClass} font-medium`}>
            {displayText}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Avatar组件的预设变体
 */

/**
 * 用户头像 - 针对用户信息优化的预设
 */
export function UserAvatar({
  user,
  size = 'md',
  theme = 'primary',
  onClick
}: {
  user: { 
    email?: string; 
    employee_name?: string; 
    [key: string]: any; 
  };
  size?: AvatarSize;
  theme?: AvatarTheme;
  onClick?: () => void;
}) {
  return (
    <Avatar
      email={user.email}
      employeeName={user.employee_name}
      size={size}
      theme={theme}
      onClick={onClick}
    />
  );
}

/**
 * 小型头像 - 用于列表和导航栏
 */
export function CompactAvatar({
  email,
  employeeName,
  theme = 'primary',
  onClick
}: {
  email?: string;
  employeeName?: string; 
  theme?: AvatarTheme;
  onClick?: () => void;
}) {
  return (
    <Avatar
      email={email}
      employeeName={employeeName}
      size="sm"
      theme={theme}
      onClick={onClick}
    />
  );
}

/**
 * 大型头像 - 用于详情页和个人资料
 */
export function LargeAvatar({
  email,
  employeeName,
  theme = 'primary',
  onClick
}: {
  email?: string;
  employeeName?: string;
  theme?: AvatarTheme; 
  onClick?: () => void;
}) {
  return (
    <Avatar
      email={email}
      employeeName={employeeName}
      size="lg"
      theme={theme}
      onClick={onClick}
    />
  );
}

export default Avatar;