import { usePayrollStatusOptions } from '@/hooks/payroll/usePayrollStatusOptions';
import { type PayrollStatusType } from '@/hooks/payroll';

interface PayrollStatusSelectorProps {
  /** 当前选中的状态值 */
  value: PayrollStatusType | 'all';
  /** 状态变更回调 */
  onChange: (status: PayrollStatusType | 'all') => void;
  /** 自定义样式类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否显示"全部状态"选项 */
  showAllOption?: boolean;
  /** 组件尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 通用薪资状态选择器组件
 * 
 * 功能特性：
 * - 动态获取所有可用的薪资状态
 * - 支持"全部状态"选项
 * - 一致的 DaisyUI 样式
 * - 完全受控组件
 * - 响应式设计
 */
export function PayrollStatusSelector({
  value,
  onChange,
  className = '',
  disabled = false,
  placeholder = '选择薪资状态',
  showAllOption = true,
  size = 'md'
}: PayrollStatusSelectorProps) {
  const { selectOptions, statusOptions } = usePayrollStatusOptions();
  
  // 根据是否显示"全部"选项决定使用哪个选项列表
  const options = showAllOption ? selectOptions : statusOptions;
  
  // 尺寸样式映射
  const sizeClasses = {
    sm: 'select-sm',
    md: '',
    lg: 'select-lg'
  };

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value as PayrollStatusType | 'all';
    onChange(selectedValue);
  };

  return (
    <div className="form-control">
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`
          select select-bordered w-full
          ${sizeClasses[size]}
          ${disabled ? 'select-disabled' : ''}
          ${className}
        `.trim()}
        aria-label="薪资状态选择"
      >
        {/* 占位符选项 */}
        {!value && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        
        {/* 状态选项 */}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            title={option.description}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * 带标签的薪资状态选择器
 */
interface PayrollStatusSelectorWithLabelProps extends PayrollStatusSelectorProps {
  /** 标签文本 */
  label?: string;
  /** 是否必填 */
  required?: boolean;
  /** 帮助文本 */
  helperText?: string;
}

export function PayrollStatusSelectorWithLabel({
  label = '薪资状态',
  required = false,
  helperText,
  ...selectorProps
}: PayrollStatusSelectorWithLabelProps) {
  return (
    <div className="form-control w-full">
      {/* 标签 */}
      <label className="label">
        <span className="label-text">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </span>
      </label>
      
      {/* 选择器 */}
      <PayrollStatusSelector {...selectorProps} />
      
      {/* 帮助文本 */}
      {helperText && (
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            {helperText}
          </span>
        </label>
      )}
    </div>
  );
}

/**
 * 紧凑型薪资状态选择器（用于工具栏）
 */
interface CompactPayrollStatusSelectorProps extends Omit<PayrollStatusSelectorProps, 'size'> {
  /** 是否显示图标 */
  showIcon?: boolean;
}

export function CompactPayrollStatusSelector({
  showIcon = true,
  className = '',
  ...props
}: CompactPayrollStatusSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {/* 图标 */}
      {showIcon && (
        <svg 
          className="w-4 h-4 text-base-content/70" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" 
          />
        </svg>
      )}
      
      {/* 选择器 */}
      <PayrollStatusSelector
        {...props}
        size="sm"
        className={`min-w-32 ${className}`}
      />
    </div>
  );
}