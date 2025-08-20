import React, { useCallback } from 'react';

export interface UniversalSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onReset?: () => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * 通用搜索框组件 - 简洁版本，适用于各种页面
 * 特点：
 * - 简洁的输入框+搜索按钮设计
 * - 支持回车键搜索
 * - 加载状态指示
 * - 响应式设计
 * - 可自定义样式
 */
export const UniversalSearchBox: React.FC<UniversalSearchBoxProps> = ({
  value,
  onChange,
  onSearch,
  onReset,
  loading = false,
  placeholder = '搜索...',
  className = '',
  disabled = false,
}) => {
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch();
    }
  }, [onSearch]);

  const handleClear = useCallback(() => {
    onChange('');
    if (onReset) {
      onReset();
    }
  }, [onChange, onReset]);

  return (
    <div className={`form-control w-full max-w-md ${className}`}>
      <div className="input-group">
        <input
          type="text"
          placeholder={placeholder}
          className="input input-bordered w-full"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={loading || disabled}
        />
        <button 
          className={`btn btn-square btn-primary ${loading ? 'loading' : ''}`}
          onClick={onSearch}
          disabled={loading || disabled}
          title="搜索"
        >
          {!loading && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
        {value && onReset && (
          <button 
            className="btn btn-outline"
            onClick={handleClear}
            disabled={loading || disabled}
            title="清除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default UniversalSearchBox;