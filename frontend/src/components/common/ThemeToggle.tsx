import React, { useEffect, useState } from 'react';
import { MoonIcon, SunIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

/**
 * ThemeToggle - 主题切换组件
 * 支持亮色、暗色和跟随系统三种模式
 * 财务系统专用主题切换，确保专业性和易用性
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md',
  showLabels = false
}) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
      if (currentTheme === 'system') {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    };

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [currentTheme]);

  // 从localStorage读取保存的主题偏好
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-preference') as ThemeMode;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme === 'system' ? systemTheme : savedTheme);
    } else {
      // 默认使用系统主题
      setCurrentTheme('system');
      applyTheme(systemTheme);
    }
  }, [systemTheme]);

  // 应用标准DaisyUI主题到DOM
  const applyTheme = (theme: 'light' | 'dark') => {
    const html = document.documentElement;
    
    // 使用标准DaisyUI内置主题
    html.setAttribute('data-theme', theme);
    
    // 清理旧的类名以避免冲突
    html.classList.remove('light', 'dark', 'financial-light', 'financial-dark');
  };

  // 切换主题
  const handleThemeChange = (newTheme: ThemeMode) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('theme-preference', newTheme);
    
    const actualTheme = newTheme === 'system' ? systemTheme : newTheme;
    applyTheme(actualTheme);
  };

  // 图标尺寸映射
  const iconSizeMap = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4', 
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  // 按钮尺寸映射
  const buttonSizeMap = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  };

  const iconSize = iconSizeMap[size];
  const buttonSize = buttonSizeMap[size];

  const themes: Array<{
    key: ThemeMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }> = [
    {
      key: 'light',
      label: '亮色模式',
      icon: SunIcon,
      description: '明亮清晰，适合白天使用'
    },
    {
      key: 'dark',
      label: '暗色模式', 
      icon: MoonIcon,
      description: '护眼舒适，适合夜间使用'
    },
    {
      key: 'system',
      label: '跟随系统',
      icon: ComputerDesktopIcon,
      description: '自动跟随系统设置'
    }
  ];

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <div
        tabIndex={0}
        role="button"
        className={`btn ${buttonSize} btn-ghost gap-2 hover:btn-primary hover:text-primary-content transition-colors`}
        aria-label="切换主题"
      >
        {(() => {
          const activeTheme = themes.find(t => t.key === currentTheme);
          const IconComponent = activeTheme?.icon || SunIcon;
          return (
            <>
              <IconComponent className={iconSize} />
              {showLabels && (
                <span className="hidden sm:inline">
                  {activeTheme?.label}
                </span>
              )}
            </>
          );
        })()}
      </div>
      
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-50 w-64 p-2 shadow-lg border border-base-300"
      >
        <li className="menu-title">
          <span className="text-base-content font-medium">选择主题</span>
        </li>
        
        {themes.map((theme) => {
          const IconComponent = theme.icon;
          const isActive = currentTheme === theme.key;
          
          return (
            <li key={theme.key}>
              <button
                onClick={() => handleThemeChange(theme.key)}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-content' 
                    : 'hover:bg-base-200'
                }`}
              >
                <IconComponent className={`${iconSize} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 text-left">
                  <div className="font-medium">{theme.label}</div>
                  <div className={`text-xs mt-1 ${
                    isActive ? 'text-primary-content/80' : 'text-base-content/60'
                  }`}>
                    {theme.description}
                  </div>
                </div>
                {isActive && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                  </div>
                )}
              </button>
            </li>
          );
        })}
        
        <div className="divider my-1"></div>
        
        <li className="text-xs text-base-content/60 px-3 py-2">
          <div className="flex items-center justify-between">
            <span>当前系统主题:</span>
            <span className="font-medium capitalize">{systemTheme}</span>
          </div>
        </li>
      </ul>
    </div>
  );
};

/**
 * 主题相关的Hook - 使用标准DaisyUI主题
 */
export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-preference') as ThemeMode;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const systemIsDark = mediaQuery.matches;

    // 应用主题的辅助函数
    const applyThemeToDOM = (theme: 'light' | 'dark') => {
      const html = document.documentElement;
      html.setAttribute('data-theme', theme);
      html.classList.remove('light', 'dark', 'financial-light', 'financial-dark');
    };

    if (savedTheme) {
      setCurrentTheme(savedTheme);
      const theme = savedTheme === 'system' ? (systemIsDark ? 'dark' : 'light') : savedTheme;
      setActualTheme(theme);
      applyThemeToDOM(theme);
    } else {
      setCurrentTheme('system');
      const theme = systemIsDark ? 'dark' : 'light';
      setActualTheme(theme);
      applyThemeToDOM(theme);
    }

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (currentTheme === 'system') {
        const theme = e.matches ? 'dark' : 'light';
        setActualTheme(theme);
        applyThemeToDOM(theme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [currentTheme]);

  const setTheme = (newTheme: ThemeMode) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('theme-preference', newTheme);
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const systemIsDark = mediaQuery.matches;
    const theme = newTheme === 'system' ? (systemIsDark ? 'dark' : 'light') : newTheme;
    
    setActualTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  return {
    currentTheme,
    actualTheme,
    isLight: actualTheme === 'light',
    isDark: actualTheme === 'dark',
    setTheme,
  };
};

export default ThemeToggle;