import { useState, useEffect } from 'react';
import { SalaryComponentCard } from '@/components/common/SalaryComponentCard';
import { ManagementPageLayout } from '@/components/layout/ManagementPageLayout';
import { MonthPicker } from '@/components/common/MonthPicker';
import { salaryComponentFieldsService, type SalaryComponentCategory } from '@/services/salary-component-fields.service';
import { cn } from '@/lib/utils';

export default function SalaryComponentDemoPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => 
    // 默认选择 2025-01，因为该月份有真实的薪资数据
    '2025-01'
  );
  const [categories, setCategories] = useState<SalaryComponentCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载薪资组件分类数据
  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const data = await salaryComponentFieldsService.getSalaryComponentCategories(selectedMonth);
        setCategories(data);
      } catch (error) {
        console.error('Failed to load salary component categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [selectedMonth]);

  const handleCategoryChange = (category: string, checked: boolean) => {
    setSelectedCategories(prev => 
      checked 
        ? [...prev, category]
        : prev.filter(c => c !== category)
    );
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(c => c.category));
    }
  };

  const selectedCategoriesData = categories.filter(c => 
    selectedCategories.includes(c.category)
  );

  const totalFields = selectedCategoriesData.reduce((sum, c) => sum + c.fields.length, 0);
  const totalRecords = selectedCategoriesData.reduce(
    (sum, c) => sum + c.fields.reduce((fieldSum, f) => fieldSum + f.record_count, 0), 
    0
  );

  const customContent = (
    <div className="space-y-6">
      {/* 月份选择和操作区 */}
      <div className="card bg-base-100 shadow-lg border border-base-200">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">薪资组件分类选择</h3>
              <p className="text-sm text-base-content/60">
                选择要复制的薪资组件分类，展开查看具体字段详情
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div>
                <label className="text-sm text-base-content/80 mb-2 block">
                  数据来源月份
                </label>
                <MonthPicker
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  placeholder="选择月份"
                  showDataIndicators={true}
                  size="sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleSelectAll}
                >
                  {selectedCategories.length === categories.length ? '取消全选' : '全选'}
                </button>
                <div className="text-sm text-base-content/60">
                  已选 {selectedCategories.length}/{categories.length} 个分类
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 选择摘要 */}
      {selectedCategories.length > 0 && (
        <div className="alert alert-info">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-medium">复制配置预览</div>
            <div className="text-sm">
              将从 {selectedMonth} 复制 {selectedCategories.length} 个分类的配置，
              包含 {totalFields} 个字段，涉及 {totalRecords} 条记录
            </div>
          </div>
        </div>
      )}

      {/* 薪资组件分类卡片 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium">
            薪资组件分类 ({selectedMonth})
          </h4>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <span className="loading loading-spinner loading-sm"></span>
              加载中...
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton h-24 w-full"></div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="card bg-base-100 border border-base-200">
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-base-content/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h5 className="text-lg font-medium text-base-content/60 mb-2">
                暂无薪资数据
              </h5>
              <p className="text-sm text-base-content/40">
                {selectedMonth} 月份暂无薪资组件数据，请选择其他月份
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {categories.map((category) => (
              <SalaryComponentCard
                key={category.category}
                title={category.displayName}
                subtitle={category.description}
                icon={<span className="text-xl">{category.icon}</span>}
                checked={selectedCategories.includes(category.category)}
                onChange={(checked) => handleCategoryChange(category.category, checked)}
                variant={salaryComponentFieldsService.getCategoryVariant(category.category)}
                fieldsData={category.fields.map(field => ({
                  name: field.field_name,
                  displayName: field.field_display_name,
                  recordCount: field.record_count,
                  avgAmount: field.avg_amount,
                  category: field.component_category
                }))}
              />
            ))}
          </div>
        )}
      </div>

      {/* 技术说明 */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="p-6 space-y-4">
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            孔雀屏组件特性
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-base-content mb-3">交互设计</h5>
              <ul className="space-y-2 text-sm text-base-content/80">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>优雅的展开/收起动画效果</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>数据摘要：字段数量、记录统计、平均金额</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>智能过滤：仅显示有数据的字段</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>视觉指示器：清晰的展开状态提示</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-base-content mb-3">数据展示</h5>
              <ul className="space-y-2 text-sm text-base-content/80">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>字段中英文名称对照</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>记录数量统计（有多少人有此项数据）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>平均金额计算</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>滚动区域支持，适配大量字段</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h6 className="font-medium text-primary mb-1">应用场景</h6>
                <p className="text-sm text-base-content/70">
                  此孔雀屏组件特别适用于薪资复制功能。用户可以通过展开不同分类的卡片，
                  精确了解每个分类包含哪些具体字段，以及这些字段在源月份的数据情况，
                  从而做出更明智的复制选择，避免复制空数据或不需要的字段。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ManagementPageLayout
      title="薪资组件孔雀屏演示"
      subtitle="展示可展开的薪资组件分类选择器"
      customContent={customContent}
    />
  );
}