import { cn } from '@/lib/utils';

interface GaoXiaoCaiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'default' | 'white' | 'primary';
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8', 
  lg: 'w-10 h-10',
  xl: 'w-12 h-12'
};

export function GaoXiaoCaiLogo({ 
  className, 
  size = 'md', 
  showText = false,
  variant = 'default'
}: GaoXiaoCaiLogoProps) {
  const getColors = () => {
    switch (variant) {
      case 'white':
        return {
          primary: '#ffffff',
          secondary: '#f0f0f0',
          text: '#ffffff'
        };
      case 'primary':
        return {
          primary: 'currentColor',
          secondary: 'currentColor',
          text: 'currentColor'
        };
      default:
        return {
          primary: '#3b82f6', // blue-500
          secondary: '#1d4ed8', // blue-700
          text: '#1f2937' // gray-800
        };
    }
  };

  const colors = getColors();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg 
        className={sizeClasses[size]}
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 外圆环 - 代表"高校"的学术环境 */}
        <circle 
          cx="24" 
          cy="24" 
          r="22" 
          stroke={colors.primary} 
          strokeWidth="2" 
          fill="none"
        />
        
        {/* 内部图标 - 金币/财务符号 */}
        <circle 
          cx="24" 
          cy="24" 
          r="16" 
          fill={colors.primary}
          fillOpacity="0.1"
        />
        
        {/* 中心的"财"字符号 - 简化版 */}
        <g transform="translate(24,24)">
          {/* 上横线 */}
          <path 
            d="M-8,-6 L8,-6" 
            stroke={colors.secondary} 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          {/* 中竖线 */}
          <path 
            d="M0,-6 L0,8" 
            stroke={colors.secondary} 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          {/* 中横线 */}
          <path 
            d="M-6,0 L6,0" 
            stroke={colors.secondary} 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          {/* 下横线 */}
          <path 
            d="M-4,6 L4,6" 
            stroke={colors.secondary} 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          {/* 左侧装饰 */}
          <circle 
            cx="-10" 
            cy="0" 
            r="2" 
            fill={colors.primary}
          />
          {/* 右侧装饰 */}
          <circle 
            cx="10" 
            cy="0" 
            r="2" 
            fill={colors.primary}
          />
        </g>
        
        {/* 底部小装饰点 */}
        <circle cx="24" cy="38" r="1.5" fill={colors.primary} />
        <circle cx="20" cy="36" r="1" fill={colors.primary} fillOpacity="0.6" />
        <circle cx="28" cy="36" r="1" fill={colors.primary} fillOpacity="0.6" />
      </svg>
      
      {showText && (
        <span 
          className="font-semibold text-sm"
          style={{ color: colors.text }}
        >
          高校财
        </span>
      )}
    </div>
  );
}