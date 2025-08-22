/**
 * 原生DOM操作的遮罩组件
 * 完全绕过React的SVG渲染，直接操作DOM
 */

import { useEffect, useRef } from 'react';
import type { OnboardingOverlayProps } from '@/types/onboarding';

export const OnboardingOverlayNative = ({
  targetElement,
  config,
  onClick,
  className = ''
}: OnboardingOverlayProps) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('[OnboardingOverlayNative] useEffect called', {
      targetElement: !!targetElement,
      configEnabled: config.enabled
    });

    if (!config.enabled || !targetElement) {
      // 清理已存在的遮罩
      if (overlayRef.current) {
        document.body.removeChild(overlayRef.current);
        overlayRef.current = null;
      }
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const padding = 8;
    const x = Math.max(0, rect.left - padding);
    const y = Math.max(0, rect.top - padding);
    const width = Math.min(rect.width + padding * 2, window.innerWidth - x);
    const height = Math.min(rect.height + padding * 2, window.innerHeight - y);

    console.log('[OnboardingOverlayNative] Creating native overlay', {
      rect, x, y, width, height
    });

    // 创建原生DOM元素
    const overlayDiv = document.createElement('div');
    overlayDiv.innerHTML = `
      <svg width="100%" height="100%" style="position: fixed; top: 0; left: 0; z-index: 40; pointer-events: auto;">
        <defs>
          <mask id="native-overlay-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="${config.color || 'rgba(0, 0, 0, 0.6)'}" fill-opacity="${config.opacity || 0.5}" mask="url(#native-overlay-mask)" />
        <rect x="${x-1}" y="${y-1}" width="${width+2}" height="${height+2}" rx="9" fill="none" stroke="rgba(59, 130, 246, 0.8)" stroke-width="1" />
      </svg>
    `;

    // 添加点击事件
    if (onClick && config.clickToClose) {
      overlayDiv.addEventListener('click', (e) => {
        if (!targetElement.contains(e.target as Node)) {
          onClick();
        }
      });
    }

    document.body.appendChild(overlayDiv);
    overlayRef.current = overlayDiv;

    // 清理函数
    return () => {
      if (overlayRef.current) {
        document.body.removeChild(overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [targetElement, config, onClick]);

  // 这个组件不渲染任何内容到React树
  return null;
};