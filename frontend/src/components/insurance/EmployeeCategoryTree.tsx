import React, { useState, useCallback } from 'react';
import type { EmployeeCategory } from '@/types/insurance';

interface EmployeeCategoryTreeProps {
  categories: EmployeeCategory[];
  selectedCategory?: string;
  onSelectCategory: (categoryId: string, category: EmployeeCategory) => void;
  rulesCount?: Map<string, number>; // 每个类别配置的保险规则数量
  loading?: boolean;
}

interface CategoryNodeProps {
  category: EmployeeCategory;
  selectedCategory?: string;
  onSelect: (categoryId: string, category: EmployeeCategory) => void;
  rulesCount?: Map<string, number>;
  level: number;
}

// 单个类别节点组件
const CategoryNode: React.FC<CategoryNodeProps> = ({
  category,
  selectedCategory,
  onSelect,
  rulesCount,
  level
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleSelect = useCallback(() => {
    onSelect(category.id, category);
  }, [category, onSelect]);

  // 判断是否选中
  const isSelected = selectedCategory === category.id;
  const categoryRulesCount = rulesCount?.get(category.id) || 0;

  return (
    <div className="select-none">
      {/* 类别节点 */}
      <div
        className={`
          flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200
          ${isSelected 
            ? 'bg-primary text-primary-content shadow-md' 
            : 'hover:bg-base-200 hover:shadow-sm'
          }
        `}
        style={{ marginLeft: `${level * 16}px` }}
        onClick={handleSelect}
      >
        {/* 展开/收起按钮 */}
        <div className="flex-shrink-0 w-5 h-5 mr-2">
          {hasChildren ? (
            <button
              className={`
                btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0
                ${isSelected ? 'text-primary-content' : 'text-base-content'}
              `}
              onClick={handleToggle}
              title={isExpanded ? '收起' : '展开'}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-4 h-4"></div> // 占位符保持对齐
          )}
        </div>

        {/* 类别信息 */}
        <div className="flex-grow flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-medium text-sm">{category.name}</span>
            {category.parent_name && (
              <span className={`text-xs opacity-70 ${isSelected ? 'text-primary-content' : 'text-base-content/60'}`}>
                归属: {category.parent_name}
              </span>
            )}
          </div>

          {/* 规则统计 */}
          <div className="flex items-center gap-2">
            {categoryRulesCount > 0 && (
              <span 
                className={`
                  badge badge-sm
                  ${isSelected ? 'badge-primary-content' : 'badge-success'}
                `}
                title={`已配置 ${categoryRulesCount} 项保险规则`}
              >
                {categoryRulesCount}
              </span>
            )}
            
            {hasChildren && (
              <span 
                className={`
                  badge badge-sm
                  ${isSelected ? 'badge-primary-content' : 'badge-outline'}
                `}
                title={`包含 ${category.children!.length} 个子类别`}
              >
                {category.children!.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 子类别 */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {category.children!.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              selectedCategory={selectedCategory}
              onSelect={onSelect}
              rulesCount={rulesCount}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 员工类别树组件
 * 显示层级化的员工类别结构，支持选择和展开/收起
 */
const EmployeeCategoryTree: React.FC<EmployeeCategoryTreeProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  rulesCount = new Map(),
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandAll, setExpandAll] = useState(true);

  // 过滤类别（搜索功能）
  const filterCategories = useCallback((categories: EmployeeCategory[], term: string): EmployeeCategory[] => {
    if (!term.trim()) return categories;

    const filtered: EmployeeCategory[] = [];
    
    categories.forEach(category => {
      const matchesSearch = category.name.toLowerCase().includes(term.toLowerCase());
      const filteredChildren = category.children ? filterCategories(category.children, term) : [];
      
      if (matchesSearch || filteredChildren.length > 0) {
        filtered.push({
          ...category,
          children: filteredChildren
        });
      }
    });

    return filtered;
  }, []);

  const filteredCategories = filterCategories(categories, searchTerm);

  // 展开/收起所有
  const toggleExpandAll = useCallback(() => {
    setExpandAll(!expandAll);
    // 这里可以通过context或者state管理来控制所有节点的展开状态
    // 为简化实现，暂时通过重新渲染来处理
  }, [expandAll]);

  // 清除搜索
  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="loading loading-spinner loading-md"></span>
        <span className="ml-2">加载员工类别...</span>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-lg border border-base-300 h-full flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">员工类别</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/60">
              共 {categories.length} 个根类别
            </span>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜索类别名称..."
            className="input input-bordered input-sm w-full pr-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-base-content/60 hover:text-base-content"
              onClick={clearSearch}
              title="清除搜索"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 mt-2">
          <button
            className="btn btn-ghost btn-xs"
            onClick={toggleExpandAll}
            title={expandAll ? '收起所有' : '展开所有'}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={expandAll ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} 
              />
            </svg>
            {expandAll ? '收起所有' : '展开所有'}
          </button>

          {selectedCategory && (
            <span className="text-xs text-success">
              已选择类别
            </span>
          )}
        </div>
      </div>

      {/* 类别树 */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-base-content/60">
            {searchTerm ? (
              <>
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>未找到匹配的类别</p>
                <button 
                  className="btn btn-ghost btn-sm mt-2"
                  onClick={clearSearch}
                >
                  清除搜索条件
                </button>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p>暂无员工类别数据</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCategories.map((category) => (
              <CategoryNode
                key={category.id}
                category={category}
                selectedCategory={selectedCategory}
                onSelect={onSelectCategory}
                rulesCount={rulesCount}
                level={0}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部统计信息 */}
      <div className="p-3 border-t border-base-300 bg-base-50">
        <div className="text-xs text-base-content/60 space-y-1">
          <div className="flex justify-between">
            <span>显示类别:</span>
            <span>{filteredCategories.length}/{categories.length}</span>
          </div>
          {rulesCount.size > 0 && (
            <div className="flex justify-between">
              <span>已配置规则:</span>
              <span>{Array.from(rulesCount.values()).reduce((sum, count) => sum + count, 0)} 项</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeCategoryTree;