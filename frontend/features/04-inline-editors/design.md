# 内联编辑器系统设计方案

## 架构概述

内联编辑器系统采用可扩展的组件架构，支持多种字段类型的就地编辑。通过统一的接口设计，确保各种编辑器的一致性，同时提供强大的验证、协作和自动保存功能。

## 核心组件设计

### 1. FieldRenderer - 字段渲染器主组件

```tsx
// src/components/employee/FieldRenderer.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useFieldPermissions } from '@/hooks/useFieldPermissions';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { EditorFactory } from './editors/EditorFactory';
import { DisplayFormatter } from './DisplayFormatter';

interface FieldRendererProps {
  field: FieldMetadata;
  value: any;
  onChange: (value: any) => void;
  editingUser?: CollaborationUser;
  autoFocus?: boolean;
  className?: string;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  value,
  onChange,
  editingUser,
  autoFocus = false,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isDirty, setIsDirty] = useState(false);
  
  const fieldRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  // 权限检查
  const { canRead, canEdit, isLoading: permissionLoading } = useFieldPermissions(
    field.name,
    field.metadata?.sensitive
  );

  // 验证系统
  const {
    validate,
    errors,
    isValidating,
    clearErrors
  } = useFieldValidation(field);

  // 监听外部值变化
  useEffect(() => {
    if (!isDirty) {
      setEditValue(value);
    }
  }, [value, isDirty]);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && canEdit && !editingUser) {
      setIsEditing(true);
    }
  }, [autoFocus, canEdit, editingUser]);

  // 其他用户正在编辑时的处理
  const isLockedByOther = editingUser && !isEditing;

  const handleStartEdit = () => {
    if (!canEdit || isLockedByOther) return;
    
    setIsEditing(true);
    setEditValue(value);
    setIsDirty(false);
    clearErrors();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(value);
    setIsDirty(false);
    clearErrors();
  };

  const handleConfirmEdit = async () => {
    if (!isDirty) {
      setIsEditing(false);
      return;
    }

    // 验证新值
    const validationResult = await validate(editValue);
    if (!validationResult.isValid) {
      return; // 验证失败，保持编辑状态
    }

    // 调用外部onChange
    onChange(editValue);
    setIsEditing(false);
    setIsDirty(false);
  };

  const handleValueChange = (newValue: any) => {
    setEditValue(newValue);
    setIsDirty(newValue !== value);
    
    // 实时验证（防抖）
    clearErrors();
    setTimeout(() => validate(newValue), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // 对于单行编辑器，Enter确认；多行编辑器需要Ctrl+Enter
      if (field.type !== 'textarea') {
        e.preventDefault();
        handleConfirmEdit();
      } else if (e.ctrlKey) {
        e.preventDefault();
        handleConfirmEdit();
      }
    }
  };

  // 处理点击外部取消编辑
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && fieldRef.current && !fieldRef.current.contains(event.target as Node)) {
        if (isDirty) {
          handleConfirmEdit();
        } else {
          handleCancelEdit();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, isDirty]);

  if (!canRead) {
    return <div className="field-no-permission">无权限查看</div>;
  }

  return (
    <div
      ref={fieldRef}
      className={`
        field-renderer
        ${className}
        ${isEditing ? 'editing' : ''}
        ${isLockedByOther ? 'locked' : ''}
        ${errors.length > 0 ? 'has-errors' : ''}
        ${isDirty ? 'dirty' : ''}
      `}
      onKeyDown={handleKeyDown}
    >
      {/* 字段标签 */}
      <div className="field-label">
        <label htmlFor={`field-${field.name}`}>
          {field.label}
          {field.required && <span className="required">*</span>}
        </label>
        
        {/* 协作状态指示器 */}
        {editingUser && (
          <div className="editing-indicator">
            <div 
              className="user-avatar"
              style={{ backgroundColor: editingUser.color }}
              title={`${editingUser.name} 正在编辑`}
            >
              {editingUser.name.charAt(0)}
            </div>
            <span className="editing-text">正在编辑...</span>
          </div>
        )}
      </div>

      {/* 字段内容区域 */}
      <div className="field-content">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="field-editor-container"
            >
              {/* 编辑器 */}
              <div className="field-editor">
                <EditorFactory
                  ref={editorRef}
                  fieldType={field.type}
                  value={editValue}
                  metadata={field.metadata}
                  onChange={handleValueChange}
                  onEnterKey={handleConfirmEdit}
                  autoFocus={true}
                  placeholder={field.placeholder}
                  disabled={isValidating}
                />
              </div>

              {/* 编辑器工具栏 */}
              <div className="editor-toolbar">
                <button
                  type="button"
                  className="btn-confirm"
                  onClick={handleConfirmEdit}
                  disabled={isValidating || errors.length > 0}
                  title="确认 (Enter)"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCancelEdit}
                  title="取消 (Esc)"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="field-display-container"
              onClick={handleStartEdit}
            >
              {/* 显示值 */}
              <div className={`field-display ${canEdit ? 'editable' : ''}`}>
                <DisplayFormatter
                  fieldType={field.type}
                  value={value}
                  metadata={field.metadata}
                />
                
                {/* 编辑图标 */}
                {canEdit && !isLockedByOther && (
                  <div className="edit-icon">
                    <PencilIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 验证错误信息 */}
        <AnimatePresence>
          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="field-errors"
            >
              {errors.map((error, index) => (
                <div key={index} className="error-message">
                  {error.message}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 加载状态 */}
        {(permissionLoading || isValidating) && (
          <div className="field-loading">
            <div className="loading-spinner" />
          </div>
        )}
      </div>
    </div>
  );
};
```

### 2. EditorFactory - 编辑器工厂

```tsx
// src/components/employee/editors/EditorFactory.tsx
import React, { forwardRef } from 'react';
import { TextEditor } from './TextEditor';
import { NumberEditor } from './NumberEditor';
import { SelectEditor } from './SelectEditor';
import { DateEditor } from './DateEditor';
import { FileEditor } from './FileEditor';
import { PhoneEditor } from './PhoneEditor';
import { EmailEditor } from './EmailEditor';
import { IdCardEditor } from './IdCardEditor';
import { TextareaEditor } from './TextareaEditor';
import { CurrencyEditor } from './CurrencyEditor';

interface EditorFactoryProps {
  fieldType: string;
  value: any;
  metadata?: Record<string, any>;
  onChange: (value: any) => void;
  onEnterKey?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const EditorFactory = forwardRef<any, EditorFactoryProps>(({
  fieldType,
  value,
  metadata = {},
  onChange,
  onEnterKey,
  autoFocus = false,
  placeholder,
  disabled = false
}, ref) => {
  const commonProps = {
    value,
    onChange,
    onEnterKey,
    autoFocus,
    placeholder,
    disabled,
    metadata,
    ref
  };

  switch (fieldType) {
    case 'text':
      return <TextEditor {...commonProps} />;
    
    case 'textarea':
      return <TextareaEditor {...commonProps} />;
    
    case 'number':
      return <NumberEditor {...commonProps} />;
    
    case 'currency':
      return <CurrencyEditor {...commonProps} />;
    
    case 'select':
      return <SelectEditor {...commonProps} options={metadata.options || []} />;
    
    case 'multiselect':
      return (
        <SelectEditor 
          {...commonProps} 
          options={metadata.options || []} 
          multiple={true} 
        />
      );
    
    case 'date':
      return <DateEditor {...commonProps} />;
    
    case 'datetime':
      return <DateEditor {...commonProps} includeTime={true} />;
    
    case 'file':
      return <FileEditor {...commonProps} />;
    
    case 'image':
      return <FileEditor {...commonProps} accept="image/*" preview={true} />;
    
    case 'phone':
      return <PhoneEditor {...commonProps} />;
    
    case 'email':
      return <EmailEditor {...commonProps} />;
    
    case 'id_card':
      return <IdCardEditor {...commonProps} />;
    
    default:
      return <TextEditor {...commonProps} />;
  }
});
```

### 3. 具体编辑器实现示例

#### TextEditor - 文本编辑器

```tsx
// src/components/employee/editors/TextEditor.tsx
import React, { forwardRef, useRef, useEffect } from 'react';
import { useIMEComposition } from '@/hooks/useIMEComposition';

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onEnterKey?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  disabled?: boolean;
  metadata?: Record<string, any>;
}

export const TextEditor = forwardRef<HTMLInputElement, TextEditorProps>(({
  value = '',
  onChange,
  onEnterKey,
  autoFocus = false,
  placeholder,
  disabled = false,
  metadata = {}
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isComposing, onCompositionStart, onCompositionEnd } = useIMEComposition();

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing && onEnterKey) {
      e.preventDefault();
      onEnterKey();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // 应用格式化规则
    const formatted = applyTextFormatting(newValue, metadata);
    onChange(formatted);
  };

  return (
    <input
      ref={ref || inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
      placeholder={placeholder}
      disabled={disabled}
      className="text-editor"
      maxLength={metadata.maxLength}
    />
  );
});

// 文本格式化函数
function applyTextFormatting(value: string, metadata: Record<string, any>): string {
  let formatted = value;

  // 应用大小写转换
  if (metadata.case === 'upper') {
    formatted = formatted.toUpperCase();
  } else if (metadata.case === 'lower') {
    formatted = formatted.toLowerCase();
  } else if (metadata.case === 'title') {
    formatted = formatted.replace(/\w\S*/g, txt => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  // 移除非法字符
  if (metadata.allowedChars) {
    const regex = new RegExp(`[^${metadata.allowedChars}]`, 'g');
    formatted = formatted.replace(regex, '');
  }

  return formatted;
}
```

#### SelectEditor - 选择编辑器

```tsx
// src/components/employee/editors/SelectEditor.tsx
import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Option {
  value: any;
  label: string;
  disabled?: boolean;
  description?: string;
}

interface SelectEditorProps {
  value: any;
  options: Option[];
  multiple?: boolean;
  onChange: (value: any) => void;
  onEnterKey?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  disabled?: boolean;
  metadata?: Record<string, any>;
}

export const SelectEditor = forwardRef<HTMLDivElement, SelectEditorProps>(({
  value,
  options,
  multiple = false,
  onChange,
  onEnterKey,
  autoFocus = false,
  placeholder = '请选择...',
  disabled = false,
  metadata = {}
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // 过滤选项
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 虚拟化（用于大量选项）
  const virtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => optionsRef.current,
    estimateSize: () => 40,
    overscan: 5
  });

  useEffect(() => {
    if (autoFocus) {
      setIsOpen(true);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  const handleOptionSelect = (option: Option) => {
    if (option.disabled) return;

    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const isSelected = currentValues.some(v => v === option.value);
      
      const newValues = isSelected
        ? currentValues.filter(v => v !== option.value)
        : [...currentValues, option.value];
      
      onChange(newValues);
    } else {
      onChange(option.value);
      setIsOpen(false);
      onEnterKey?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleOptionSelect(filteredOptions[focusedIndex]);
        } else if (!multiple) {
          onEnterKey?.();
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const getDisplayValue = () => {
    if (multiple) {
      const selectedOptions = options.filter(opt => 
        Array.isArray(value) && value.includes(opt.value)
      );
      return selectedOptions.length > 0
        ? selectedOptions.map(opt => opt.label).join(', ')
        : placeholder;
    } else {
      const selectedOption = options.find(opt => opt.value === value);
      return selectedOption ? selectedOption.label : placeholder;
    }
  };

  const removeValue = (valueToRemove: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      const newValues = (Array.isArray(value) ? value : []).filter(v => v !== valueToRemove);
      onChange(newValues);
    } else {
      onChange(null);
    }
  };

  return (
    <div
      ref={ref || containerRef}
      className="select-editor"
      onKeyDown={handleKeyDown}
    >
      {/* 选择器触发器 */}
      <div
        className={`select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleToggle}
      >
        <div className="select-value">
          {multiple && Array.isArray(value) && value.length > 0 ? (
            <div className="multi-values">
              {options
                .filter(opt => value.includes(opt.value))
                .map(opt => (
                  <span key={opt.value} className="value-tag">
                    {opt.label}
                    <button
                      type="button"
                      onClick={(e) => removeValue(opt.value, e)}
                      className="remove-value"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))
              }
            </div>
          ) : (
            <span className={value ? '' : 'placeholder'}>
              {getDisplayValue()}
            </span>
          )}
        </div>
        
        <ChevronDownIcon 
          className={`select-arrow ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {/* 下拉选项 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="select-dropdown"
          >
            {/* 搜索框 */}
            {metadata.searchable && (
              <div className="select-search">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索选项..."
                  className="search-input"
                />
              </div>
            )}

            {/* 选项列表 */}
            <div
              ref={optionsRef}
              className="options-container"
              style={{ height: Math.min(filteredOptions.length * 40, 200) }}
            >
              {virtualizer.getVirtualItems().map(virtualItem => {
                const option = filteredOptions[virtualItem.index];
                const isSelected = multiple
                  ? Array.isArray(value) && value.includes(option.value)
                  : value === option.value;
                const isFocused = focusedIndex === virtualItem.index;

                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    className={`
                      select-option
                      ${isSelected ? 'selected' : ''}
                      ${isFocused ? 'focused' : ''}
                      ${option.disabled ? 'disabled' : ''}
                    `}
                    onClick={() => handleOptionSelect(option)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`
                    }}
                  >
                    <div className="option-content">
                      <span className="option-label">{option.label}</span>
                      {option.description && (
                        <span className="option-description">{option.description}</span>
                      )}
                    </div>
                    
                    {isSelected && multiple && (
                      <div className="option-check">✓</div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
```

### 4. 验证系统

```tsx
// src/hooks/useFieldValidation.ts
import { useState, useCallback } from 'react';
import { debounce } from 'lodash-es';

interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'length' | 'unique' | 'custom';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const useFieldValidation = (field: FieldMetadata) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const validateField = async (value: any): Promise<ValidationResult> => {
    setIsValidating(true);
    const fieldErrors: ValidationError[] = [];

    try {
      // 必填验证
      if (field.required && (value === null || value === undefined || value === '')) {
        fieldErrors.push({
          field: field.name,
          message: `${field.label}是必填项`,
          type: 'required'
        });
      }

      // 格式验证
      if (value && field.validation) {
        const formatValidation = validateFormat(value, field.type, field.validation);
        if (!formatValidation.isValid) {
          fieldErrors.push(...formatValidation.errors);
        }
      }

      // 长度验证
      if (value && field.validation) {
        const lengthValidation = validateLength(value, field.validation);
        if (!lengthValidation.isValid) {
          fieldErrors.push(...lengthValidation.errors);
        }
      }

      // 远程验证（唯一性等）
      if (value && field.validation?.remote) {
        const remoteValidation = await validateRemote(field.name, value);
        if (!remoteValidation.isValid) {
          fieldErrors.push(...remoteValidation.errors);
        }
      }

      // 自定义验证规则
      if (value && field.validation?.custom) {
        const customValidation = await field.validation.custom(value);
        if (!customValidation.isValid) {
          fieldErrors.push(...customValidation.errors);
        }
      }

    } catch (error) {
      fieldErrors.push({
        field: field.name,
        message: '验证过程中发生错误',
        type: 'custom'
      });
    }

    setErrors(fieldErrors);
    setIsValidating(false);

    return {
      isValid: fieldErrors.length === 0,
      errors: fieldErrors
    };
  };

  // 防抖验证
  const debouncedValidate = useCallback(
    debounce(validateField, 300),
    [field]
  );

  const clearErrors = () => {
    setErrors([]);
  };

  return {
    validate: validateField,
    validateAsync: debouncedValidate,
    errors,
    isValidating,
    clearErrors
  };
};

// 格式验证函数
function validateFormat(value: any, fieldType: string, validation: any): ValidationResult {
  const errors: ValidationError[] = [];

  switch (fieldType) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push({
          field: fieldType,
          message: '请输入有效的邮箱地址',
          type: 'format'
        });
      }
      break;

    case 'phone':
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(value)) {
        errors.push({
          field: fieldType,
          message: '请输入有效的手机号码',
          type: 'format'
        });
      }
      break;

    case 'id_card':
      if (!validateIdCard(value)) {
        errors.push({
          field: fieldType,
          message: '请输入有效的身份证号码',
          type: 'format'
        });
      }
      break;

    case 'number':
      if (isNaN(Number(value))) {
        errors.push({
          field: fieldType,
          message: '请输入有效的数字',
          type: 'format'
        });
      }
      break;
  }

  // 自定义正则验证
  if (validation.pattern) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(value)) {
      errors.push({
        field: fieldType,
        message: validation.patternMessage || '格式不正确',
        type: 'format'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 长度验证函数
function validateLength(value: any, validation: any): ValidationResult {
  const errors: ValidationError[] = [];
  const length = String(value).length;

  if (validation.minLength && length < validation.minLength) {
    errors.push({
      field: 'length',
      message: `最少需要${validation.minLength}个字符`,
      type: 'length'
    });
  }

  if (validation.maxLength && length > validation.maxLength) {
    errors.push({
      field: 'length',
      message: `最多只能输入${validation.maxLength}个字符`,
      type: 'length'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 远程验证函数
async function validateRemote(fieldName: string, value: any): Promise<ValidationResult> {
  try {
    const response = await fetch('/api/v2/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: fieldName, value })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        field: fieldName,
        message: '无法验证字段值',
        type: 'custom'
      }]
    };
  }
}

// 身份证验证函数
function validateIdCard(idCard: string): boolean {
  if (!/^\d{17}[\dX]$/.test(idCard)) return false;

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i]) * weights[i];
  }
  
  const checkCode = checkCodes[sum % 11];
  return checkCode === idCard[17];
}
```

### 5. 自动保存机制

```tsx
// src/hooks/useAutoSave.ts
import { useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash-es';

interface AutoSaveOptions {
  delay?: number;
  maxRetries?: number;
  onSave: (data: any) => Promise<void>;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export const useAutoSave = (data: any, options: AutoSaveOptions) => {
  const {
    delay = 1000,
    maxRetries = 3,
    onSave,
    onError,
    onSuccess
  } = options;

  const retryCountRef = useRef(0);
  const lastSavedDataRef = useRef(data);

  const saveData = useCallback(async (dataToSave: any) => {
    try {
      await onSave(dataToSave);
      lastSavedDataRef.current = dataToSave;
      retryCountRef.current = 0;
      onSuccess?.();
    } catch (error) {
      retryCountRef.current++;
      
      if (retryCountRef.current < maxRetries) {
        // 指数退避重试
        const retryDelay = Math.pow(2, retryCountRef.current) * 1000;
        setTimeout(() => saveData(dataToSave), retryDelay);
      } else {
        onError?.(error as Error);
      }
    }
  }, [onSave, maxRetries, onError, onSuccess]);

  const debouncedSave = useCallback(
    debounce(saveData, delay),
    [saveData, delay]
  );

  useEffect(() => {
    // 只有当数据真正发生变化时才保存
    if (JSON.stringify(data) !== JSON.stringify(lastSavedDataRef.current)) {
      debouncedSave(data);
    }
  }, [data, debouncedSave]);

  // 组件卸载时立即保存
  useEffect(() => {
    return () => {
      debouncedSave.flush();
    };
  }, [debouncedSave]);
};
```

## 样式设计

```scss
// src/styles/components/field-renderer.scss
.field-renderer {
  @apply relative;

  &.editing {
    .field-display {
      @apply hidden;
    }
  }

  &.locked {
    @apply opacity-75 pointer-events-none;

    .field-display {
      @apply bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800;
    }
  }

  &.has-errors {
    .field-editor {
      @apply border-red-300 dark:border-red-700;
    }
  }

  &.dirty {
    .field-display::after {
      content: '*';
      @apply text-amber-500 ml-1;
    }
  }

  .field-label {
    @apply flex items-center justify-between mb-2;

    label {
      @apply text-sm font-medium text-gray-700 dark:text-gray-300;

      .required {
        @apply text-red-500 ml-1;
      }
    }

    .editing-indicator {
      @apply flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400;

      .user-avatar {
        @apply w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-semibold;
      }
    }
  }

  .field-content {
    @apply relative;
  }

  .field-display-container {
    .field-display {
      @apply min-h-[2.5rem] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 flex items-center justify-between group;

      &.editable {
        @apply cursor-pointer hover:border-primary-300 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700/50;
      }

      .edit-icon {
        @apply opacity-0 group-hover:opacity-100 transition-opacity ml-2;

        svg {
          @apply w-4 h-4 text-gray-400;
        }
      }
    }
  }

  .field-editor-container {
    @apply flex gap-2;

    .field-editor {
      @apply flex-1;

      input, textarea, select {
        @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
      }
    }

    .editor-toolbar {
      @apply flex gap-1;

      button {
        @apply w-8 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors;

        &.btn-confirm {
          @apply text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20;

          &:disabled {
            @apply opacity-50 cursor-not-allowed;
          }
        }

        &.btn-cancel {
          @apply text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700;
        }
      }
    }
  }

  .field-errors {
    @apply mt-1 space-y-1;

    .error-message {
      @apply text-sm text-red-600 dark:text-red-400;
    }
  }

  .field-loading {
    @apply absolute top-0 right-0 p-2;

    .loading-spinner {
      @apply w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin;
    }
  }
}

// 选择器样式
.select-editor {
  @apply relative;

  .select-trigger {
    @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 cursor-pointer flex items-center justify-between;

    &:hover {
      @apply border-gray-400 dark:border-gray-500;
    }

    &.open {
      @apply border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800;
    }

    &.disabled {
      @apply opacity-50 cursor-not-allowed;
    }

    .select-value {
      @apply flex-1 text-gray-900 dark:text-gray-100;

      .placeholder {
        @apply text-gray-500 dark:text-gray-400;
      }

      .multi-values {
        @apply flex flex-wrap gap-1;

        .value-tag {
          @apply inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs rounded;

          .remove-value {
            @apply hover:bg-primary-200 dark:hover:bg-primary-800 rounded;
          }
        }
      }
    }

    .select-arrow {
      @apply w-5 h-5 text-gray-400 transition-transform duration-200;

      &.rotate-180 {
        @apply rotate-180;
      }
    }
  }

  .select-dropdown {
    @apply absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50;

    .select-search {
      @apply p-2 border-b border-gray-200 dark:border-gray-700;

      .search-input {
        @apply w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500;
      }
    }

    .options-container {
      @apply relative overflow-auto;

      .select-option {
        @apply px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700;

        &.selected {
          @apply bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300;
        }

        &.focused {
          @apply bg-gray-100 dark:bg-gray-600;
        }

        &.disabled {
          @apply opacity-50 cursor-not-allowed;
        }

        .option-content {
          @apply flex-1;

          .option-label {
            @apply block text-sm;
          }

          .option-description {
            @apply block text-xs text-gray-500 dark:text-gray-400;
          }
        }

        .option-check {
          @apply text-primary-600 dark:text-primary-400 font-bold;
        }
      }
    }
  }
}
```

## 总结

内联编辑器系统通过以下特性提供强大的编辑功能：

1. **统一接口**：所有编辑器遵循相同的接口规范，确保一致性
2. **类型丰富**：支持文本、数字、选择、日期等多种字段类型
3. **智能验证**：实时验证、远程验证、自定义验证规则
4. **协作友好**：显示编辑状态、防止冲突、实时同步
5. **用户体验**：流畅的动画、键盘快捷键、自动保存
6. **高性能**：虚拟化、防抖、懒加载等优化措施
7. **可访问性**：完整的键盘导航和屏幕阅读器支持

这个设计为员工详情模态框提供了专业级的内联编辑体验。