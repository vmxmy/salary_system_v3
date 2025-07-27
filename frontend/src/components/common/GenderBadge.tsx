import React from 'react';

interface GenderBadgeProps {
  gender: string | undefined;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  outline?: boolean;
}

/**
 * 性别徽章组件 - 使用DaisyUI语义化颜色
 * 支持主题切换，颜色会随主题自动调整
 */
export const GenderBadge: React.FC<GenderBadgeProps> = ({ 
  gender, 
  className = '',
  size = 'sm',
  outline = false
}) => {
  const getGenderConfig = (gender: string | undefined) => {
    const normalizedGender = gender?.toLowerCase().trim();
    
    switch (normalizedGender) {
      case '男':
      case 'male':
      case 'm':
        return {
          class: 'badge-info',
          text: '男',
          icon: '♂'
        };
      case '女':
      case 'female':
      case 'f':
        return {
          class: 'badge-secondary',
          text: '女',
          icon: '♀'
        };
      case '其他':
      case 'other':
      case 'o':
        return {
          class: 'badge-accent',
          text: '其他',
          icon: '⚧'
        };
      case '未知':
      case 'unknown':
      case '':
      case null:
      case undefined:
        return {
          class: 'badge-ghost',
          text: '未知',
          icon: '？'
        };
      default:
        return {
          class: 'badge-neutral',
          text: gender || '未知',
          icon: ''
        };
    }
  };

  const config = getGenderConfig(gender);
  const sizeClass = size ? `badge-${size}` : '';
  const outlineClass = outline ? 'badge-outline' : '';

  return (
    <div className={`badge ${config.class} ${sizeClass} ${outlineClass} ${className}`}>
      {config.icon || config.text}
    </div>
  );
};

export default GenderBadge;