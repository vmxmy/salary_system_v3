import { useState } from 'react';
import { MonthPicker } from '@/components/common/MonthPicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';

export default function MonthPickerDemoPage() {
  const [selectedMonth1, setSelectedMonth1] = useState('');
  const [selectedMonth2, setSelectedMonth2] = useState('2025-01');
  const [selectedMonth3, setSelectedMonth3] = useState('');
  const [selectedMonth4, setSelectedMonth4] = useState('');

  // 获取当前年月
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // 计算限制日期
  const minDate = '2024-01';
  const maxDate = '2025-12';

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <PageHeader
        title="月份选择器演示"
        description="展示优雅精致的月份选择器组件"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 基础用法 */}
        <div className={cardEffects.modern}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">基础用法</h3>
            <p className="text-sm text-base-content/60">点击选择月份</p>
            
            <MonthPicker
              value={selectedMonth1}
              onChange={setSelectedMonth1}
              placeholder="请选择月份"
            />
            
            {selectedMonth1 && (
              <p className="text-sm text-primary">
                已选择: {selectedMonth1}
              </p>
            )}
          </div>
        </div>

        {/* 默认值 */}
        <div className={cardEffects.modern}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">带默认值</h3>
            <p className="text-sm text-base-content/60">预设当前年月</p>
            
            <MonthPicker
              value={selectedMonth2}
              onChange={setSelectedMonth2}
              placeholder="请选择月份"
            />
            
            <p className="text-sm text-primary">
              已选择: {selectedMonth2}
            </p>
          </div>
        </div>

        {/* 日期限制 */}
        <div className={cardEffects.modern}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">日期限制</h3>
            <p className="text-sm text-base-content/60">
              限制在 {minDate} 到 {maxDate} 之间
            </p>
            
            <MonthPicker
              value={selectedMonth3}
              onChange={setSelectedMonth3}
              placeholder="请选择月份"
              minDate={minDate}
              maxDate={maxDate}
            />
            
            {selectedMonth3 && (
              <p className="text-sm text-primary">
                已选择: {selectedMonth3}
              </p>
            )}
          </div>
        </div>

        {/* 不同尺寸 */}
        <div className={cardEffects.modern}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">不同尺寸</h3>
            <p className="text-sm text-base-content/60">支持 sm、md、lg 三种尺寸</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-base-content/60 mb-1 block">小尺寸</label>
                <MonthPicker
                  value={selectedMonth4}
                  onChange={setSelectedMonth4}
                  placeholder="请选择月份"
                  size="sm"
                />
              </div>
              
              <div>
                <label className="text-xs text-base-content/60 mb-1 block">中尺寸（默认）</label>
                <MonthPicker
                  value={selectedMonth4}
                  onChange={setSelectedMonth4}
                  placeholder="请选择月份"
                  size="md"
                />
              </div>
              
              <div>
                <label className="text-xs text-base-content/60 mb-1 block">大尺寸</label>
                <MonthPicker
                  value={selectedMonth4}
                  onChange={setSelectedMonth4}
                  placeholder="请选择月份"
                  size="lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 禁用状态 */}
        <div className={cardEffects.modern}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">禁用状态</h3>
            <p className="text-sm text-base-content/60">不可选择</p>
            
            <MonthPicker
              value={currentYearMonth}
              onChange={() => {}}
              placeholder="请选择月份"
              disabled
            />
          </div>
        </div>

        {/* 特性说明 */}
        <div className={cardEffects.modern}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">组件特性</h3>
            <ul className="space-y-2 text-sm text-base-content/80">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>优雅的动画效果，使用 Framer Motion</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>快捷选择：本月、上月、今年</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>当前月份标记（小圆点）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>悬停效果和选中状态</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>支持日期范围限制</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>响应式设计，适配各种屏幕</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}