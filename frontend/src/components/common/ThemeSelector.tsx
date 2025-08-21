import React, { useEffect, useState } from 'react';
import { PaintBrushIcon } from '@heroicons/react/24/outline';

// DaisyUI 官方所有主题列表及配色预览
const DAISYUI_THEMES = [
  { 
    name: 'light', 
    label: '浅色',
    colors: ['#570df8', '#f000b8', '#37cdbe', '#3abff8'],
    description: '经典明亮主题，适合日间办公'
  },
  { 
    name: 'dark', 
    label: '深色',
    colors: ['#661ae6', '#f000b8', '#37cdbe', '#3abff8'],
    description: '深色护眼主题，适合夜间使用'
  },
  { 
    name: 'cupcake', 
    label: '纸杯蛋糕',
    colors: ['#65c3c8', '#ef9fbc', '#eeaf3a', '#f7f3e9'],
    description: '温暖可爱的粉嫩配色'
  },
  { 
    name: 'bumblebee', 
    label: '大黄蜂',
    colors: ['#e0a82e', '#f9d72f', '#181830', '#f9f7fd'],
    description: '活力四射的黄黑配色'
  },
  { 
    name: 'emerald', 
    label: '翡翠绿',
    colors: ['#66cc8a', '#377cfb', '#ea5234', '#f4f4f4'],
    description: '清新自然的绿色主题'
  },
  { 
    name: 'corporate', 
    label: '企业风',
    colors: ['#4b6bfb', '#7c3aed', '#f471b5', '#e5e7eb'],
    description: '专业商务的企业配色'
  },
  { 
    name: 'synthwave', 
    label: '合成波',
    colors: ['#e779c1', '#58c7f3', '#f806cc', '#221551'],
    description: '霓虹复古的赛博朋克风格'
  },
  { 
    name: 'retro', 
    label: '复古',
    colors: ['#ef9995', '#a4cbb4', '#dc8850', '#faf7f2'],
    description: '怀旧温馨的复古色调'
  },
  { 
    name: 'cyberpunk', 
    label: '赛博朋克',
    colors: ['#ff7598', '#75d1f0', '#c74cc0', '#0d1117'],
    description: '未来科技的霓虹配色'
  },
  { 
    name: 'valentine', 
    label: '情人节',
    colors: ['#e96d7b', '#a991f7', '#88dbdd', '#f8e8e8'],
    description: '浪漫粉色的情人节主题'
  },
  { 
    name: 'halloween', 
    label: '万圣节',
    colors: ['#f28c18', '#6d3a9c', '#51a800', '#212121'],
    description: '神秘橙紫的万圣节配色'
  },
  { 
    name: 'garden', 
    label: '花园',
    colors: ['#5c7f67', '#ecf4e7', '#fbbf24', '#faf7f2'],
    description: '清新自然的花园配色'
  },
  { 
    name: 'forest', 
    label: '森林',
    colors: ['#1eb854', '#1fd65f', '#fbbf24', '#f3f4f6'],
    description: '深邃宁静的森林绿调'
  },
  { 
    name: 'aqua', 
    label: '水蓝',
    colors: ['#09ecf3', '#966fb3', '#fbbf24', '#3d4451'],
    description: '清凉透彻的水蓝配色'
  },
  { 
    name: 'lofi', 
    label: 'Lo-Fi',
    colors: ['#0d0d0d', '#1a1a1a', '#262626', '#0a0a0a'],
    description: '简约低调的黑白灰调'
  },
  { 
    name: 'pastel', 
    label: '粉彩',
    colors: ['#d1c1d7', '#f6cbd1', '#b4e7ce', '#f9f1f1'],
    description: '柔和舒缓的马卡龙色调'
  },
  { 
    name: 'fantasy', 
    label: '奇幻',
    colors: ['#6e0b75', '#007ebd', '#f471b5', '#f8fafc'],
    description: '梦幻奇幻的魔法配色'
  },
  { 
    name: 'wireframe', 
    label: '线框',
    colors: ['#b8b8b8', '#b8b8b8', '#b8b8b8', '#f8f8f8'],
    description: '极简线框的设计师风格'
  },
  { 
    name: 'black', 
    label: '纯黑',
    colors: ['#373737', '#373737', '#373737', '#000000'],
    description: '极致简约的纯黑主题'
  },
  { 
    name: 'luxury', 
    label: '奢华',
    colors: ['#ffffff', '#09090b', '#a3a3a3', '#09090b'],
    description: '高端奢华的金白配色'
  },
  { 
    name: 'dracula', 
    label: '德古拉',
    colors: ['#ff79c6', '#8be9fd', '#50fa7b', '#282a36'],
    description: '暗黑优雅的吸血鬼配色'
  },
  { 
    name: 'cmyk', 
    label: 'CMYK',
    colors: ['#45AEEE', '#E8488A', '#FFF04C', '#f9f9f9'],
    description: '印刷设计的三原色配色'
  },
  { 
    name: 'autumn', 
    label: '秋天',
    colors: ['#8c0327', '#d85251', '#7c2d12', '#f1f5f9'],
    description: '温暖深沉的秋日配色'
  },
  { 
    name: 'business', 
    label: '商务',
    colors: ['#1c4ed8', '#be185d', '#059669', '#f8fafc'],
    description: '专业稳重的商务配色'
  },
  { 
    name: 'acid', 
    label: '酸性',
    colors: ['#ff00aa', '#ff6600', '#ffff00', '#f1f5f9'],
    description: '强烈鲜艳的酸性配色'
  },
  { 
    name: 'lemonade', 
    label: '柠檬水',
    colors: ['#519903', '#03a9f4', '#a3a3a3', '#f9f9f9'],
    description: '清新活力的柠檬配色'
  },
  { 
    name: 'night', 
    label: '夜晚',
    colors: ['#7c3aed', '#1e40af', '#b91c1c', '#0f172a'],
    description: '深邃神秘的夜空配色'
  },
  { 
    name: 'coffee', 
    label: '咖啡',
    colors: ['#db2777', '#7c2d12', '#a3a3a3', '#292524'],
    description: '温暖香醇的咖啡配色'
  },
  { 
    name: 'winter', 
    label: '冬天',
    colors: ['#047aed', '#2563eb', '#3b82f6', '#f8fafc'],
    description: '清冷纯净的冬日配色'
  },
  { 
    name: 'dim', 
    label: '昏暗',
    colors: ['#9333ea', '#7c3aed', '#a855f7', '#2a2e37'],
    description: '低调暗淡的昏暗配色'
  },
  { 
    name: 'nord', 
    label: '北欧',
    colors: ['#5e81ac', '#81a1c1', '#b48ead', '#eceff4'],
    description: '简约清新的北欧配色'
  },
  { 
    name: 'sunset', 
    label: '日落',
    colors: ['#ff5733', '#ff8c42', '#ffc947', '#f8f4e6'],
    description: '温暖绚烂的日落配色'
  },
];

interface ThemeSelectorProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

/**
 * ThemeSelector - DaisyUI 主题选择器
 * 支持所有 DaisyUI 官方主题
 */
export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className = '',
  size = 'md',
  showLabels = false
}) => {
  const [currentTheme, setCurrentTheme] = useState<string>('cupcake');

  // 从 localStorage 读取保存的主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('daisyui-theme');
    if (savedTheme && DAISYUI_THEMES.some(theme => theme.name === savedTheme)) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // 默认使用 cupcake 主题
      setCurrentTheme('cupcake');
      applyTheme('cupcake');
    }
  }, []);

  // 应用主题到 DOM
  const applyTheme = (theme: string) => {
    console.log('Applying theme:', theme);
    
    // 强制重新加载主题
    document.documentElement.removeAttribute('data-theme');
    
    // 使用 requestAnimationFrame 确保重新渲染
    requestAnimationFrame(() => {
      document.documentElement.setAttribute('data-theme', theme);
      console.log('Current data-theme:', document.documentElement.getAttribute('data-theme'));
      
      // 验证是否生效，检查 CSS 变量
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor = computedStyle.getPropertyValue('--p') || computedStyle.getPropertyValue('--color-primary');
      console.log('Primary color (--p):', primaryColor);
      console.log('All theme vars:', {
        primary: computedStyle.getPropertyValue('--p'),
        secondary: computedStyle.getPropertyValue('--s'),
        accent: computedStyle.getPropertyValue('--a'),
        base100: computedStyle.getPropertyValue('--b1')
      });
    });
  };

  // 切换主题
  const handleThemeChange = (newTheme: string) => {
    console.log('Theme change requested:', newTheme);
    setCurrentTheme(newTheme);
    localStorage.setItem('daisyui-theme', newTheme);
    applyTheme(newTheme);
    
    // 广播主题变化事件给其他组件
    window.dispatchEvent(new CustomEvent('daisyui-theme-change', {
      detail: { theme: newTheme }
    }));
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

  const currentThemeLabel = DAISYUI_THEMES.find(t => t.name === currentTheme)?.label || '主题';

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <div
        tabIndex={0}
        role="button"
        className={`btn ${buttonSize} btn-primary gap-2 transition-colors`}
        aria-label="选择主题"
      >
        <SwatchIcon className={iconSize} />
        {showLabels && (
          <span className="hidden sm:inline">
            {currentThemeLabel}
          </span>
        )}
      </div>
      
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-50 w-48 p-1 shadow-lg border border-base-300"
      >
        <div className="grid grid-cols-1 gap-0.5 max-h-72 overflow-y-auto">
          {DAISYUI_THEMES.map((theme) => {
            const isActive = currentTheme === theme.name;
            
            return (
              <li key={theme.name}>
                <button
                  onClick={() => handleThemeChange(theme.name)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-content' 
                      : 'hover:bg-base-200'
                  }`}
                >
                  {/* 主题配色预览 */}
                  <div className="flex gap-0.5">
                    {theme.colors.map((color, index) => (
                      <div
                        key={index}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="text-xs font-medium">{theme.label}</div>
                  </div>
                  
                  {isActive && (
                    <div className="w-1.5 h-1.5 bg-primary-content rounded-full"></div>
                  )}
                </button>
              </li>
            );
          })}
        </div>
      </ul>
    </div>
  );
};

/**
 * 主题相关的 Hook
 */
// 全局状态管理 - 使用事件来同步所有组件
const THEME_CHANGE_EVENT = 'daisyui-theme-change';

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<string>('cupcake');

  useEffect(() => {
    // 初始化主题
    const savedTheme = localStorage.getItem('daisyui-theme');
    const initialTheme = (savedTheme && DAISYUI_THEMES.some(theme => theme.name === savedTheme)) 
      ? savedTheme 
      : 'cupcake';
    
    setCurrentTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    // 监听主题变化事件
    const handleThemeChange = (event: CustomEvent) => {
      setCurrentTheme(event.detail.theme);
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange as EventListener);
    };
  }, []);

  const setTheme = (newTheme: string) => {
    if (DAISYUI_THEMES.some(theme => theme.name === newTheme)) {
      setCurrentTheme(newTheme);
      localStorage.setItem('daisyui-theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      
      // 广播主题变化事件
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
        detail: { theme: newTheme }
      }));
    }
  };

  return {
    currentTheme,
    setTheme,
    availableThemes: DAISYUI_THEMES,
  };
};

export default ThemeSelector;