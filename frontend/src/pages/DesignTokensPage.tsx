import React, { useState } from 'react';

/**
 * 设计令牌展示页面
 * 用于展示和测试所有设计令牌，方便开发者查阅和使用
 */
export const DesignTokensPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('spacing');
  
  // 简化的令牌数据
  const tokenCategories = {
    spacing: {
      '0.5': '2px',
      '1': '4px',
      '2': '8px',
      '3': '12px',
      '4': '16px',
      '6': '24px',
      '8': '32px',
    },
    fontSize: {
      'xs': '12px',
      'sm': '14px',
      'base': '16px',
      'lg': '18px',
      'xl': '20px',
      '2xl': '24px',
    },
    colors: {
      'primary': '#1e40af',
      'secondary': '#374151',
      'success': '#059669',
      'error': '#dc2626',
      'warning': '#d97706',
    },
  };
  
  const categories = Object.keys(tokenCategories);
  const currentTokens = tokenCategories[selectedCategory as keyof typeof tokenCategories] || {};

  // 渲染令牌值
  const renderTokenValue = (value: any) => {
    if (typeof value === 'string') {
      return <code className="text-sm bg-base-200 px-2 py-1 rounded">{value}</code>;
    }
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <code key={index} className="block text-sm bg-base-200 px-2 py-1 rounded">
              {typeof item === 'string' ? item : JSON.stringify(item)}
            </code>
          ))}
        </div>
      );
    }
    if (typeof value === 'object' && value !== null) {
      return (
        <pre className="text-sm bg-base-200 p-2 rounded overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return <code className="text-sm bg-base-200 px-2 py-1 rounded">{String(value)}</code>;
  };

  // 渲染间距令牌的可视化预览
  const renderSpacingPreview = (_key: string, value: string) => {
    if (typeof value === 'string' && value.includes('px')) {
      const size = parseInt(value);
      if (size <= 100) {
        return (
          <div className="flex items-center gap-2">
            <div 
              className="bg-primary rounded" 
              style={{ width: value, height: '8px' }}
            />
            <span className="text-xs text-base-content/60">{value}</span>
          </div>
        );
      }
    }
    return null;
  };

  // 渲染颜色令牌的预览
  const renderColorPreview = (key: string, value: string) => {
    if (key.includes('color') || key.includes('shadow')) {
      return (
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded border border-base-300"
            style={{ backgroundColor: value.includes('hsl') ? value : undefined }}
          />
          <span className="text-xs text-base-content/60">{value}</span>
        </div>
      );
    }
    return null;
  };

  // 渲染字体令牌的预览
  const renderFontPreview = (key: string, value: any) => {
    if (key.includes('fontSize') && Array.isArray(value)) {
      return (
        <div 
          className="text-base-content p-2 bg-base-100 rounded border"
          style={{ 
            fontSize: value[0],
            lineHeight: value[1]?.lineHeight || 'normal'
          }}
        >
          示例文字 Sample Text
        </div>
      );
    }
    if (key.includes('fontFamily') && Array.isArray(value)) {
      return (
        <div 
          className="text-base-content p-2 bg-base-100 rounded border text-lg"
          style={{ fontFamily: value.join(', ') }}
        >
          示例文字 Sample Text 123
        </div>
      );
    }
    return null;
  };

  // 渲染阴影令牌的预览
  const renderShadowPreview = (key: string, value: string) => {
    if (key.includes('shadow') || key.includes('elevation')) {
      return (
        <div 
          className="w-16 h-16 bg-base-100 rounded border border-base-300"
          style={{ boxShadow: value }}
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 页面标题和统计信息 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-base-content mb-2">
              设计令牌管理中心
            </h1>
            <p className="text-base-content/70 text-lg mb-4">
              财务系统设计令牌集合 - 统一的视觉设计规范
            </p>
            <div className="flex gap-6">
              <div className="bg-base-200 px-4 py-2 rounded-lg">
                <div className="text-sm text-base-content/60">总令牌数</div>
                <div className="text-2xl font-bold text-primary">50+</div>
              </div>
              <div className="bg-base-200 px-4 py-2 rounded-lg">
                <div className="text-sm text-base-content/60">令牌类别</div>
                <div className="text-2xl font-bold text-secondary">{categories.length}</div>
              </div>
              <div className="bg-base-200 px-4 py-2 rounded-lg">
                <div className="text-sm text-base-content/60">版本</div>
                <div className="text-lg font-medium text-accent">1.0.0</div>
              </div>
            </div>
          </div>
        </div>

        {/* 分类导航 */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`btn btn-sm ${
                  selectedCategory === category 
                    ? 'btn-primary' 
                    : 'btn-ghost'
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* 令牌展示区域 */}
        <div className="space-y-6">
          <div className="bg-base-200 rounded-xl p-6 border border-base-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-base-content capitalize">
                {selectedCategory} 令牌
              </h2>
              <div className="badge badge-primary">
                {Object.keys(currentTokens).length} 个令牌
              </div>
            </div>

            {/* 令牌列表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(currentTokens).map(([key, value]) => (
                  <div key={key} className="bg-base-100 rounded-lg p-4 border border-base-300">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-mono text-sm font-medium text-primary">
                          {key}
                        </h3>
                        <div className="text-xs text-base-content/60 mt-1">
                          类别: {selectedCategory}
                        </div>
                      </div>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(`${selectedCategory}-${key}`);
                        }}
                        title="复制类名"
                      >
                        复制
                      </button>
                    </div>

                    {/* 令牌值显示 */}
                    <div className="mb-3">
                      {renderTokenValue(value)}
                    </div>

                    {/* 可视化预览 */}
                    <div className="space-y-2">
                      {renderSpacingPreview(key, value as string)}
                      {renderColorPreview(key, value as string)}
                      {renderFontPreview(key, value)}
                      {renderShadowPreview(key, value as string)}
                    </div>

                    {/* 使用示例 */}
                    <div className="mt-3 pt-3 border-t border-base-300">
                      <div className="text-xs text-base-content/60 mb-1">CSS 类名:</div>
                      <code className="text-xs bg-base-300 px-2 py-1 rounded block">
                        {selectedCategory === 'spacing' && `p-${key}`}
                        {selectedCategory === 'fontSize' && `text-${key}`}
                        {selectedCategory === 'colors' && `text-${key}`}
                        {!['spacing', 'fontSize', 'colors'].includes(selectedCategory) && `${selectedCategory}-${key}`}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        </div>

        {/* 使用指南 */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-2xl font-semibold mb-4">使用指南</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">如何使用令牌</h3>
              <div className="space-y-2 text-sm text-base-content/70">
                <p>1. 在组件中使用 Tailwind CSS 类名</p>
                <p>2. 使用设计令牌保证视觉一致性</p>
                <p>3. 避免硬编码数值，使用预定义令牌</p>
                <p>4. 遵循语义化命名规范</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-3">令牌命名规范</h3>
              <div className="space-y-2 text-sm text-base-content/70">
                <p>• spacing-* : 间距令牌 (margin, padding)</p>
                <p>• text-* : 文字相关令牌</p>
                <p>• shadow-* : 阴影效果令牌</p>
                <p>• rounded-* : 圆角令牌</p>
                <p>• duration-* : 动画时长令牌</p>
              </div>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="text-center text-base-content/60 py-8">
          <p>设计令牌管理中心 - 版本 1.0.0</p>
          <p className="text-sm mt-1">最后更新: 2025-01-25</p>
        </div>
      </div>
    </div>
  );
};

export default DesignTokensPage;