/**
 * DaisyUI 主题颜色配置
 * 基于 DaisyUI 5 的标准 CSS 变量系统
 */

// 获取 DaisyUI CSS 变量的实际颜色值
const getDaisyUIColor = (variable: string): string => {
  if (typeof window !== 'undefined') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable);
    // 转换 HSL 值为 RGB 格式供 Recharts 使用
    if (value.trim()) {
      const hslValues = value.trim().split(' ');
      if (hslValues.length >= 3) {
        return `hsl(${hslValues[0]} ${hslValues[1]} ${hslValues[2]})`;
      }
    }
  }
  // 回退颜色（浅色主题的默认值）
  const fallbacks: Record<string, string> = {
    '--p': '259 94% 51%',      // Primary - 蓝色
    '--s': '314 100% 47%',     // Secondary - 粉色  
    '--a': '174 60% 51%',      // Accent - 青色
    '--n': '219 14% 28%',      // Neutral - 深灰
    '--b1': '0 0% 100%',       // Base-100 - 白色
    '--b2': '0 0% 95%',        // Base-200 - 浅灰
    '--b3': '0 0% 90%',        // Base-300 - 中灰
    '--bc': '215 28% 17%',     // Base-content - 深色文字
    '--in': '198 93% 60%',     // Info - 信息蓝
    '--su': '158 64% 52%',     // Success - 成功绿
    '--wa': '43 96% 56%',      // Warning - 警告黄
    '--er': '0 91% 71%',       // Error - 错误红
  };
  const fallback = fallbacks[variable] || '0 0% 50%';
  return `hsl(${fallback})`;
};

// 实时获取主题颜色的函数
export const getThemeColors = () => ({
  primary: getDaisyUIColor('--p'),
  secondary: getDaisyUIColor('--s'),
  accent: getDaisyUIColor('--a'),
  neutral: getDaisyUIColor('--n'),
  base100: getDaisyUIColor('--b1'),
  base200: getDaisyUIColor('--b2'),
  base300: getDaisyUIColor('--b3'),
  baseContent: getDaisyUIColor('--bc'),
  info: getDaisyUIColor('--in'),
  success: getDaisyUIColor('--su'),
  warning: getDaisyUIColor('--wa'),
  error: getDaisyUIColor('--er'),
});

// 图表专用颜色方案
export const CHART_COLORS = {
  // 主要数据系列颜色（按重要性排序）
  primary: () => getDaisyUIColor('--p'),
  secondary: () => getDaisyUIColor('--s'),
  accent: () => getDaisyUIColor('--a'),
  
  // 状态颜色
  success: () => getDaisyUIColor('--su'),
  warning: () => getDaisyUIColor('--wa'),
  error: () => getDaisyUIColor('--er'),
  info: () => getDaisyUIColor('--in'),
  
  // 中性色调（用于辅助数据）
  neutral: () => getDaisyUIColor('--n'),
  
  // 背景和边框
  background: () => getDaisyUIColor('--b1'),
  surface: () => getDaisyUIColor('--b2'),
  border: () => getDaisyUIColor('--b3'),
  text: () => getDaisyUIColor('--bc'),
  
  // 透明度变体
  primaryOpacity: (opacity = 0.3) => {
    const base = getDaisyUIColor('--p');
    return base.replace('hsl(', `hsla(`).replace(')', `, ${opacity})`);
  },
  
  secondaryOpacity: (opacity = 0.3) => {
    const base = getDaisyUIColor('--s');
    return base.replace('hsl(', `hsla(`).replace(')', `, ${opacity})`);
  },
  
  accentOpacity: (opacity = 0.3) => {
    const base = getDaisyUIColor('--a');
    return base.replace('hsl(', `hsla(`).replace(')', `, ${opacity})`);
  },
};

// 预定义的图表颜色组合
export const CHART_COLOR_SCHEMES = {
  // 财务图表主色调（蓝色系为主）
  financial: [
    CHART_COLORS.primary,      // Primary blue
    CHART_COLORS.secondary,    // Secondary accent
    CHART_COLORS.accent,       // Tertiary accent
    CHART_COLORS.info,         // Info blue
    CHART_COLORS.success,      // Success green
    CHART_COLORS.warning,      // Warning yellow
    CHART_COLORS.error,        // Error red
    CHART_COLORS.neutral,      // Neutral gray
  ],
  
  // 状态指示器（预警系统）
  status: {
    safe: CHART_COLORS.success,
    caution: CHART_COLORS.warning,
    warning: CHART_COLORS.error,
    critical: CHART_COLORS.error,
  },
  
  // 部门对比（多色彩）
  departments: [
    CHART_COLORS.primary,
    CHART_COLORS.secondary,
    CHART_COLORS.accent,
    CHART_COLORS.info,
    CHART_COLORS.success,
    CHART_COLORS.warning,
    () => getDaisyUIColor('--p') + '80', // Primary with opacity
    () => getDaisyUIColor('--s') + '80', // Secondary with opacity
  ],
  
  // 薪资结构（语义化颜色）
  payrollStructure: {
    grossPay: CHART_COLORS.primary,        // 应发工资 - 主色
    deductions: CHART_COLORS.warning,      // 扣除项 - 警告色
    netPay: CHART_COLORS.success,          // 实发工资 - 成功色
    tax: CHART_COLORS.error,               // 税收 - 错误色（突出）
    insurance: CHART_COLORS.info,          // 保险 - 信息色
    other: CHART_COLORS.neutral,           // 其他 - 中性色
  }
};

// 工具函数：获取颜色数组（函数形式转换为字符串）
export const resolveColors = (colorFunctions: (() => string)[]): string[] => {
  return colorFunctions.map(fn => fn());
};

// 工具函数：根据索引获取循环颜色
export const getColorByIndex = (index: number, scheme: (() => string)[] = CHART_COLOR_SCHEMES.financial): string => {
  return scheme[index % scheme.length]();
};

// 工具函数：监听主题变化
export const onThemeChange = (callback: () => void) => {
  if (typeof window !== 'undefined') {
    // 监听 data-theme 属性变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          callback();
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    // 也监听自定义主题变化事件
    window.addEventListener('daisyui-theme-change', callback);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('daisyui-theme-change', callback);
    };
  }
  return () => {};
};