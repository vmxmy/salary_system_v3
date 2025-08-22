/**
 * 新手指导按钮组件
 * 标准化的指导系统启动按钮，用于页面头部工具栏
 */

import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { getFlowsForPage, isOnboardingSupportedPage, PAGE_FLOW_MAPPING } from '@/utils/onboardingPageUtils';

export interface OnboardingButtonProps {
  /** 按钮样式变体 */
  variant?: 'default' | 'ghost' | 'outline';
  /** 按钮大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
  /** 用户权限（用于筛选可用流程） */
  userPermissions?: readonly string[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

export function OnboardingButton({
  variant = 'outline',
  size = 'sm',
  className = '',
  userPermissions = [],
  disabled = false,
  onClick
}: OnboardingButtonProps) {
  const location = useLocation();
  const { startFlow, getAvailableFlows } = useOnboarding();

  // 获取当前页面的指导流程
  const getPageFlows = useCallback(() => {
    const pathname = location.pathname;
    
    // 检查页面是否支持指导系统
    if (!isOnboardingSupportedPage(pathname)) {
      return [];
    }
    
    // 如果没有传递用户权限，使用OnboardingContext中的getAvailableFlows方法
    // 该方法会自动获取用户权限并进行过滤
    if (userPermissions.length === 0) {
      const availableFlows = getAvailableFlows();
      
      // 简化的路径匹配逻辑，找到最佳匹配的路径
      const paths = Object.keys(PAGE_FLOW_MAPPING);
      const sortedPaths = paths.sort((a, b) => b.length - a.length);
      const matchedPath = sortedPaths.find(path => 
        pathname === path || pathname.startsWith(path + '/')
      );
      
      if (!matchedPath) return [];
      
      const pageFlowIds = PAGE_FLOW_MAPPING[matchedPath] || [];
      return availableFlows.filter(flow => pageFlowIds.includes(flow.id));
    }
    
    // 获取页面相关的流程（传统方式，当明确提供权限时使用）
    return getFlowsForPage(pathname, userPermissions);
  }, [location.pathname, userPermissions, getAvailableFlows]);

  // 启动指导流程的处理函数
  const handleStartFlow = useCallback(async () => {
    if (onClick) {
      onClick();
      return;
    }

    const pageFlows = getPageFlows();
    if (pageFlows.length > 0) {
      const firstFlow = pageFlows[0];
      try {
        await startFlow(firstFlow.id);
      } catch (error) {
        console.error('启动指导流程失败:', error);
      }
    }
  }, [onClick, getPageFlows, startFlow]);

  // 检查是否有可用的指导流程
  const pageFlows = getPageFlows();
  const hasFlows = pageFlows.length > 0;

  // 构建按钮类名
  const buttonClass = [
    'btn',
    'btn-circle',
    `btn-${variant}`,
    `btn-${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClass}
      onClick={handleStartFlow}
      disabled={disabled || !hasFlows}
      title={hasFlows ? '启动页面指导' : '当前页面暂无指导内容'}
      type="button"
    >
      <svg 
        className="w-4 h-4" 
        fill="currentColor" 
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          fillRule="evenodd" 
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" 
          clipRule="evenodd" 
        />
      </svg>
    </button>
  );
}

export default OnboardingButton;