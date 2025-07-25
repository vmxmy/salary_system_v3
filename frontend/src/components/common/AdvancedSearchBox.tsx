import React, { useState, useCallback } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';

export interface SimpleSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export const SimpleSearchBox: React.FC<SimpleSearchBoxProps> = ({
  value,
  onChange,
  onSearch,
  onReset,
  loading = false,
  placeholder = '搜索员工姓名、部门、手机号、邮箱...',
  className = '',
}) => {
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  }, [onSearch]);

  const handleClear = useCallback(() => {
    onChange('');
    onReset();
  }, [onChange, onReset]);

  return (
    <div className={`card bg-base-100 shadow-sm border ${className}`}>
      <div className="card-body p-4">
        <div className="flex gap-2 items-center">
          {/* 搜索输入框 */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
            <input
              type="text"
              className="input input-bordered w-full pl-10 pr-10"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            {value && (
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-xs p-0 min-h-0 h-6 w-6"
                onClick={handleClear}
                disabled={loading}
              >
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {/* 搜索按钮 */}
          <button
            type="button"
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            onClick={onSearch}
            disabled={loading}
          >
            <SearchIcon className="w-4 h-4" />
            搜索
          </button>
          
          {/* 重置按钮 */}
          {value && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClear}
              disabled={loading}
            >
              重置
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleSearchBox;