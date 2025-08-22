/**
 * 新用户指导遮罩层组件
 * 
 * 功能：
 * 1. SVG 遮罩技术 - 使用专业级SVG mask创建真正的"洞"效果
 * 2. 智能高亮 - 精确高亮目标元素，无模糊副作用
 * 3. 平滑动画 - 目标切换时的流畅过渡
 * 4. 响应式适配 - 自动适应不同屏幕尺寸
 * 
 * 技术说明：
 * 参考React Joyride和Reactour的实现，使用SVG <mask>元素
 * 白色区域显示内容，黑色区域隐藏内容，创建完美的高亮效果
 */

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { OnboardingOverlayProps } from '@/types/onboarding';

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number; // 圆角半径
}

export const OnboardingOverlay = ({
  targetElement,
  config,
  onClick,
  className = ''
}: OnboardingOverlayProps) => {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // 调试日志函数
  const debugLog = useCallback((message: string, data?: any) => {
    console.log(`[OnboardingOverlay] ${message}`, data);
  }, []);

  // 计算目标元素的位置和尺寸
  const calculateTargetRect = useCallback(() => {
    debugLog('calculateTargetRect called', { 
      targetElement: !!targetElement,
      elementTag: targetElement?.tagName,
      elementId: targetElement?.id,
      elementClass: targetElement?.className 
    });

    if (!targetElement) {
      debugLog('No target element, setting targetRect to null');
      setTargetRect(null);
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const padding = 8; // 高亮区域的内边距
    const borderRadius = 8; // 高亮区域的圆角
    
    debugLog('Target element getBoundingClientRect', {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom
    });
    
    // 计算带padding的目标区域
    const targetRect: TargetRect = {
      x: Math.max(0, rect.left - padding),
      y: Math.max(0, rect.top - padding),
      width: Math.min(rect.width + padding * 2, window.innerWidth - Math.max(0, rect.left - padding)),
      height: Math.min(rect.height + padding * 2, window.innerHeight - Math.max(0, rect.top - padding)),
      rx: borderRadius
    };

    debugLog('Calculated targetRect', {
      targetRect,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      padding
    });

    setTargetRect(targetRect);
  }, [targetElement, debugLog]);

  // 处理点击事件
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!config.clickToClose) return;
    
    // 检查是否点击在目标元素上
    if (targetElement && targetElement.contains(e.target as Node)) {
      return; // 不处理目标元素内的点击
    }
    
    onClick?.();
  }, [config.clickToClose, targetElement, onClick]);

  // 监听目标元素变化和视口变化
  useEffect(() => {
    debugLog('useEffect called', { 
      configEnabled: config.enabled,
      targetElement: !!targetElement 
    });

    if (!config.enabled) {
      debugLog('Config disabled, hiding overlay');
      setIsVisible(false);
      return;
    }

    debugLog('Config enabled, calculating target rect and showing overlay');
    calculateTargetRect();
    setIsVisible(true);

    const handleUpdate = () => {
      debugLog('handleUpdate called (resize/scroll)');
      calculateTargetRect();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      debugLog('Cleanup: removing event listeners');
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [config.enabled, targetElement, calculateTargetRect, debugLog]);

  debugLog('Render check', {
    configEnabled: config.enabled,
    isVisible,
    hasTargetRect: !!targetRect,
    config: {
      color: config.color,
      opacity: config.opacity,
      blur: config.blur
    }
  });

  if (!config.enabled || !isVisible || !targetRect) {
    debugLog('Not rendering overlay', {
      configEnabled: config.enabled,
      isVisible,
      hasTargetRect: !!targetRect
    });
    return null;
  }

  // 生成唯一的mask ID，使用更稳定的ID
  const maskId = `onboarding-mask-${Math.round(targetRect.x)}-${Math.round(targetRect.y)}`;
  
  debugLog('Rendering overlay with SVG mask', {
    maskId,
    targetRect,
    config
  });

  return createPortal(
    <svg
      width="100%"
      height="100%"
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 40,
        pointerEvents: 'auto'
      }}
      onClick={handleClick}
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          {/* 整个屏幕为白色（显示遮罩） */}
          <rect width="100%" height="100%" fill="white" />
          {/* 目标区域为黑色（创建透明洞） */}
          <rect
            x={targetRect.x}
            y={targetRect.y}
            width={targetRect.width}
            height={targetRect.height}
            rx={targetRect.rx}
            fill="black"
          />
        </mask>
      </defs>
      
      {/* 应用遮罩的背景 */}
      <rect
        width="100%"
        height="100%"
        fill={config.color || 'rgba(0, 0, 0, 0.5)'}
        fillOpacity={config.opacity || 0.5}
        mask={`url(#${maskId})`}
      />
      
      {/* 高亮边框 */}
      <rect
        x={targetRect.x - 1}
        y={targetRect.y - 1}
        width={targetRect.width + 2}
        height={targetRect.height + 2}
        rx={targetRect.rx + 1}
        fill="none"
        stroke="rgba(59, 130, 246, 0.8)"
        strokeWidth="1"
        style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.3))' }}
      />
    </svg>,
    document.body
  );
};