import React, { useState } from 'react';

/**
 * Tab等宽效果演示组件
 * 用于测试和对比不同的等宽方案效果
 */
export function TabWidthDemo() {
  const [activeTab, setActiveTab] = useState('tab1');

  const tabs = [
    { id: 'tab1', label: '短', icon: '📊' },
    { id: 'tab2', label: '中等长度', icon: '👥' }, 
    { id: 'tab3', label: '很长很长的标签文字', icon: '💰' },
    { id: 'tab4', label: '趋势', icon: '📈' },
    { id: 'tab5', label: '数据导出功能', icon: '📤' }
  ];

  return (
    <div className="space-y-8 p-6 bg-base-100 rounded-xl">
      <h2 className="text-2xl font-bold text-center mb-8">Tab等宽方案对比</h2>
      
      {/* 方案1: 完全等宽Grid方案 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">方案1: 完全等宽Grid方案 (推荐)</h3>
        <div 
          className="statistics-tabs-equal"
          style={{ '--tabs-count': tabs.length } as React.CSSProperties}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 方案2: 高级minmax方案 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-secondary">方案2: 高级minmax方案</h3>
        <div 
          className="tabs-perfect-equal tabs tabs-lift tabs-lg"
          style={{ '--tabs-count': tabs.length } as React.CSSProperties}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 对比说明 */}
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="font-bold">等宽效果说明</h3>
          <div className="text-sm">
            <p>• 方案1: 使用 <code>grid-template-columns: repeat(n, 1fr)</code> 实现完全等宽</p>
            <p>• 方案2: 使用 <code>minmax(0, 1fr)</code> 处理内容溢出，更加健壮</p>
            <p>• 两种方案都确保无论文字长短，每个tab占用完全相同的宽度</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TabWidthDemo;