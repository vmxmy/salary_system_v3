import { useState, useCallback, useMemo } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Table } from '@tanstack/react-table';

interface AdvancedSearchProps<TData> {
  table: Table<TData>;
  searchableFields?: string[];
  placeholder?: string;
  className?: string;
}

export function AdvancedSearch<TData>({
  table,
  searchableFields,
  placeholder = '搜索所有字段...',
  className = '',
}: AdvancedSearchProps<TData>) {
  const [searchValue, setSearchValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // 获取所有可搜索的列
  const searchableColumns = useMemo(() => {
    const allColumns = table.getAllColumns();
    
    if (searchableFields && searchableFields.length > 0) {
      return allColumns.filter(col => searchableFields.includes(col.id));
    }
    
    // 默认搜索所有文本类型的列（排除系统字段和操作列）
    return allColumns.filter(col => {
      const columnId = col.id;
      return columnId !== 'select' && 
             columnId !== 'actions' &&
             !columnId.startsWith('_') &&
             col.getCanFilter();
    });
  }, [table, searchableFields]);

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    
    // 使用全局过滤而不是列过滤
    table.setGlobalFilter(value);
  }, [table]);

  // 清除搜索
  const handleClear = useCallback(() => {
    setSearchValue('');
    table.setGlobalFilter('');
    setIsExpanded(false);
  }, [table]);

  // 获取当前搜索的字段数
  const searchFieldCount = searchableColumns.length;

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        {/* 搜索输入框 */}
        <div className={`relative transition-all duration-300 ${isExpanded ? 'w-80' : 'w-64'}`}>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => {
              if (!searchValue) setIsExpanded(false);
            }}
            placeholder={placeholder}
            className="input input-sm input-bordered w-full pl-8 pr-8"
          />
          
          {/* 搜索图标 */}
          <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
          
          {/* 清除按钮 */}
          {searchValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 搜索信息标签 */}
        <div className="badge badge-ghost badge-sm">
          搜索 {searchFieldCount} 个字段
        </div>
      </div>

      {/* 搜索提示 */}
      {isExpanded && (
        <div className="absolute z-10 top-full mt-1 left-0 right-0 p-2 bg-base-100 border border-base-300 rounded-lg shadow-lg">
          <div className="text-xs text-base-content/70">
            <p className="mb-1">💡 提示：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>输入关键词可同时搜索所有可见字段</li>
              <li>搜索支持中文、英文和数字</li>
              <li>搜索结果会实时更新</li>
              {searchableColumns.length > 0 && (
                <li>
                  当前搜索字段：
                  <span className="text-primary">
                    {searchableColumns.slice(0, 5).map(col => {
                      const header = col.columnDef.header;
                      return typeof header === 'string' ? header : col.id;
                    }).join('、')}
                    {searchableColumns.length > 5 && `等 ${searchableColumns.length} 个字段`}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// 简化版搜索框（用于紧凑布局）
export function CompactSearch<TData>({
  table,
  searchableFields,
  placeholder = '搜索...',
  className = '',
}: AdvancedSearchProps<TData>) {
  const [searchValue, setSearchValue] = useState('');

  // 获取所有可搜索的列
  const searchableColumns = useMemo(() => {
    const allColumns = table.getAllColumns();
    
    if (searchableFields && searchableFields.length > 0) {
      return allColumns.filter(col => searchableFields.includes(col.id));
    }
    
    return allColumns.filter(col => {
      const columnId = col.id;
      return columnId !== 'select' && 
             columnId !== 'actions' &&
             !columnId.startsWith('_') &&
             col.getCanFilter();
    });
  }, [table, searchableFields]);

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    
    // 使用全局过滤
    table.setGlobalFilter(value);
  }, [table]);

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={searchValue}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="input input-sm input-bordered w-full max-w-xs pl-8"
      />
      <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
    </div>
  );
}