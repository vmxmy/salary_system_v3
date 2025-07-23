import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  className?: string;
}

export function FormField({
  label,
  required = false,
  optional = false,
  children,
  error,
  hint,
  className = ''
}: FormFieldProps) {
  return (
    <div className={`form-control ${className}`}>
      <label className="label">
        <span className="label-text font-medium">{label}</span>
        {required && <span className="label-text-alt text-error">*</span>}
        {optional && <span className="label-text-alt">可选</span>}
      </label>
      {children}
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
      {hint && !error && (
        <label className="label">
          <span className="label-text-alt text-base-content/60">{hint}</span>
        </label>
      )}
    </div>
  );
}

interface TextInputProps {
  type?: 'text' | 'email' | 'password' | 'url';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TextInput({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  className = ''
}: TextInputProps) {
  return (
    <input
      type={type}
      className={`input input-bordered focus:input-primary ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

interface NumberInputProps {
  placeholder?: string;
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function NumberInput({
  placeholder,
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
  suffix,
  prefix,
  className = ''
}: NumberInputProps) {
  const inputElement = (
    <input
      type="number"
      className={`input input-bordered focus:input-primary ${suffix || prefix ? 'flex-1' : ''} ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    />
  );

  if (suffix || prefix) {
    return (
      <div className="input-group">
        {prefix && <span className="bg-base-200 text-base-content px-3 flex items-center text-sm">{prefix}</span>}
        {inputElement}
        {suffix && <span className="bg-base-200 text-base-content px-3 flex items-center text-sm">{suffix}</span>}
      </div>
    );
  }

  return inputElement;
}

interface SelectInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  disabled?: boolean;
  className?: string;
}

export function SelectInput({
  placeholder,
  value,
  onChange,
  options,
  disabled = false,
  className = ''
}: SelectInputProps) {
  return (
    <select
      className={`select select-bordered focus:select-primary ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.icon ? `${option.icon} ${option.label}` : option.label}
        </option>
      ))}
    </select>
  );
}

interface TextAreaProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

export function TextArea({
  placeholder,
  value,
  onChange,
  rows = 3,
  disabled = false,
  className = ''
}: TextAreaProps) {
  return (
    <textarea
      className={`textarea textarea-bordered focus:textarea-primary resize-none ${className}`}
      placeholder={placeholder}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

interface DateInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}

export function DateInput({
  placeholder,
  value,
  onChange,
  min,
  max,
  disabled = false,
  className = ''
}: DateInputProps) {
  return (
    <input
      type="date"
      className={`input input-bordered focus:input-primary ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      disabled={disabled}
    />
  );
}

interface CheckboxInputProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function CheckboxInput({
  checked,
  onChange,
  label,
  disabled = false,
  className = ''
}: CheckboxInputProps) {
  return (
    <label className={`label cursor-pointer justify-start gap-2 ${className}`}>
      <input
        type="checkbox"
        className="checkbox checkbox-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      {label && <span className="label-text">{label}</span>}
    </label>
  );
}

interface FormCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormCard({
  title,
  icon,
  children,
  className = ''
}: FormCardProps) {
  return (
    <div className={`card bg-base-100 border border-base-300 ${className}`}>
      <div className="card-body p-4">
        <h4 className="card-title text-base mb-4 flex items-center gap-2">
          {icon}
          {title}
        </h4>
        {children}
      </div>
    </div>
  );
}

interface ConfigurationFormProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
  submitText?: string;
  cancelText?: string;
  className?: string;
}

export function ConfigurationForm({
  title,
  subtitle,
  children,
  onSubmit,
  onCancel,
  loading = false,
  submitText = '保存',
  cancelText = '取消',
  className = ''
}: ConfigurationFormProps) {
  return (
    <div className={`modal modal-open ${className}`}>
      <div className="modal-box max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* 模态框头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-base-content">{title}</h3>
            {subtitle && (
              <p className="text-sm text-base-content/70 mt-1">{subtitle}</p>
            )}
          </div>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            disabled={loading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 表单内容 */}
        <div className="space-y-6">
          {children}
        </div>

        {/* 模态框底部 */}
        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading && <span className="loading loading-spinner loading-sm"></span>}
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
}

// 特定用途的表单组件
interface GridFormProps {
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export function GridForm({
  columns = 2,
  children,
  className = ''
}: GridFormProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 lg:grid-cols-3',
    4: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-4 ${className}`}>
      {children}
    </div>
  );
}

// 预设的表单验证函数
export const FormValidators = {
  required: (value: any, fieldName: string = '此字段') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName}不能为空`;
    }
    return null;
  },

  email: (value: string, fieldName: string = '邮箱') => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return `${fieldName}格式不正确`;
    }
    return null;
  },

  minLength: (minLength: number) => (value: string, fieldName: string = '此字段') => {
    if (!value) return null;
    if (value.length < minLength) {
      return `${fieldName}至少需要${minLength}个字符`;
    }
    return null;
  },

  maxLength: (maxLength: number) => (value: string, fieldName: string = '此字段') => {
    if (!value) return null;
    if (value.length > maxLength) {
      return `${fieldName}不能超过${maxLength}个字符`;
    }
    return null;
  },

  number: (value: string, fieldName: string = '此字段') => {
    if (!value) return null;
    if (isNaN(Number(value))) {
      return `${fieldName}必须是有效数字`;
    }
    return null;
  },

  positiveNumber: (value: string, fieldName: string = '此字段') => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return `${fieldName}必须是正数`;
    }
    return null;
  },

  range: (min: number, max: number) => (value: string, fieldName: string = '此字段') => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num)) {
      return `${fieldName}必须是有效数字`;
    }
    if (num < min || num > max) {
      return `${fieldName}必须在${min}到${max}之间`;
    }
    return null;
  },

  percentage: (value: string, fieldName: string = '百分比') => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num < 0 || num > 100) {
      return `${fieldName}必须在0到100之间`;
    }
    return null;
  }
};

// 表单验证Hook
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validators: Partial<Record<keyof T, Array<(value: any, fieldName?: string) => string | null>>>
) {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = React.useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // 清除错误（如果字段有值）
    if (value && errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const setTouched = React.useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validate = React.useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    
    Object.keys(validators).forEach(field => {
      const fieldValidators = validators[field as keyof T];
      const value = values[field as keyof T];
      
      if (fieldValidators) {
        for (const validator of fieldValidators) {
          const error = validator(value, String(field));
          if (error) {
            newErrors[field as keyof T] = error;
            break;
          }
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validators]);

  const reset = React.useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setTouched,
    validate,
    reset,
    isValid: Object.keys(errors).length === 0,
    hasErrors: Object.keys(errors).length > 0
  };
}