import { useState } from 'react';
import { MonthPicker } from '@/components/common/MonthPicker';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import { cn } from '@/lib/utils';

export default function MonthPickerDemoPage() {
  const [selectedMonth1, setSelectedMonth1] = useState('');
  const [selectedMonth2, setSelectedMonth2] = useState('2025-01');
  const [selectedMonth3, setSelectedMonth3] = useState('');
  const [selectedMonth4, setSelectedMonth4] = useState('');
  const [selectedMonthWithData, setSelectedMonthWithData] = useState('');

  // 获取当前年月
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // 计算限制日期
  const minDate = '2024-01';
  const maxDate = '2025-12';

  // 定义卡片样式
  const cardEffects = {
    modern: "card bg-base-100 shadow-lg border border-base-200 hover:shadow-xl transition-shadow duration-200"
  };

  const customContent = (
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

        {/* 数据指示器功能 */}
        <div className={cn(cardEffects.modern, "md:col-span-2")}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">🎯 数据指示器功能</h3>
            <p className="text-sm text-base-content/60">
              实时显示哪些月份有薪资数据，支持禁用已有数据的月份
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-base-content/80 mb-2 block font-medium">
                    普通模式（允许选择有数据的月份）
                  </label>
                  <MonthPicker
                    value={selectedMonthWithData}
                    onChange={setSelectedMonthWithData}
                    placeholder="选择要复制的薪资月份"
                    showDataIndicators={true}
                  />
                  {selectedMonthWithData && (
                    <p className="text-sm text-primary mt-2">
                      已选择: {selectedMonthWithData}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm text-base-content/80 mb-2 block font-medium">
                    禁用模式（禁用有数据的月份）
                  </label>
                  <MonthPicker
                    value={selectedMonth4}
                    onChange={setSelectedMonth4}
                    placeholder="选择新的薪资月份"
                    showDataIndicators={true}
                    disableMonthsWithData={true}
                  />
                  {selectedMonth4 && (
                    <p className="text-sm text-primary mt-2">
                      已选择: {selectedMonth4}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-base-content">特性亮点：</h4>
                <ul className="space-y-2 text-sm text-base-content/80">
                  <li className="flex items-start gap-2">
                    <div className="w-3 h-2 bg-success text-success-content rounded-sm flex items-center justify-center text-[8px] font-bold mt-1">51</div>
                    <span>绿色数字：可选择的月份，显示记录数量</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-3 h-2 bg-error text-error-content rounded-sm flex items-center justify-center text-[8px] font-bold mt-1">51</div>
                    <span>红色数字：禁用的月份，已有数据</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                    <span>蓝色圆点：当前月份标识</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-info mt-1">ℹ️</span>
                    <span>悬停提示：详细记录数量和禁用原因</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-warning mt-1">⚡</span>
                    <span>智能缓存：实时数据，5分钟自动更新</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="bg-info/5 border border-info/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-info mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h5 className="font-medium text-info mb-1">使用场景</h5>
                  <p className="text-sm text-base-content/70">
                    在薪资复制功能中，用户需要选择源薪资周期。通过数据指示器，用户可以一目了然地看到哪些月份有薪资数据可供复制，
                    避免选择空数据月份，提升用户体验和操作效率。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 特性说明 */}
        <div className={cn(cardEffects.modern, "md:col-span-2")}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">组件特性</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-base-content mb-3">核心功能</h4>
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
              <div>
                <h4 className="text-sm font-medium text-base-content mb-3">新增功能</h4>
                <ul className="space-y-2 text-sm text-base-content/80">
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✨</span>
                    <span>数据指示器：显示有薪资数据的月份</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✨</span>
                    <span>记录数量：直观显示每月薪资记录数</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✨</span>
                    <span>性能优化：智能缓存和条件加载</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✨</span>
                    <span>用户友好：清晰的视觉提示和说明</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✨</span>
                    <span>扩展性：支持自定义数据源</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success mt-1">✨</span>
                    <span>无障碍：ARIA 属性和键盘支持</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
  );

  return (
    <ManagementPageLayout
      title="月份选择器演示"
      subtitle="展示优雅精致的月份选择器组件"
      customContent={customContent}
    />
  );
}