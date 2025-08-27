import { useState, useEffect, useCallback } from 'react';
import { cardEffects } from '@/styles/design-effects';
import { useToast } from '@/contexts/ToastContext';
import { 
  useReportTemplates, 
  useCreateReportTemplate, 
  useUpdateReportTemplate,
  type ReportTemplate,
  type FieldMapping 
} from '@/hooks/reports/useReportManagementMock';
import { PREDEFINED_DATA_SOURCES, type DataSourceConfig } from '@/types/report-config';
import { useDataSources, useTableColumns, getRecommendedFields, getDataSourceCategory } from '@/hooks/reports/useDataSources';

interface ReportTemplateEditorProps {
  isOpen: boolean;
  templateId?: string | null;
  onClose: () => void;
  onSave: () => void;
}

// 可用字段定义
const AVAILABLE_FIELDS: FieldMapping[] = [
  // 基本信息
  { field_key: 'employee_name', display_name: '员工姓名', field_type: 'string', visible: true, sort_order: 1 },
  { field_key: 'employee_code', display_name: '员工编号', field_type: 'string', visible: false, sort_order: 2 },
  { field_key: 'root_category_name', display_name: '根分类', field_type: 'string', visible: true, sort_order: 3 },
  { field_key: 'department_name', display_name: '部门', field_type: 'string', visible: true, sort_order: 4 },
  { field_key: 'position_name', display_name: '职位', field_type: 'string', visible: true, sort_order: 5 },
  { field_key: 'category_name', display_name: '人员类别', field_type: 'string', visible: true, sort_order: 6 },
  
  // 薪资信息
  { field_key: 'gross_pay', display_name: '应发合计', field_type: 'currency', visible: true, sort_order: 10 },
  { field_key: 'total_deductions', display_name: '扣发合计', field_type: 'currency', visible: true, sort_order: 11 },
  { field_key: 'net_pay', display_name: '实发合计', field_type: 'currency', visible: true, sort_order: 12 },
  
  // 薪资组件
  { field_key: 'basic_salary', display_name: '基本工资', field_type: 'currency', visible: false, sort_order: 20 },
  { field_key: 'position_salary', display_name: '职务津贴', field_type: 'currency', visible: false, sort_order: 21 },
  { field_key: 'performance_salary', display_name: '绩效工资', field_type: 'currency', visible: false, sort_order: 22 },
  { field_key: 'overtime_pay', display_name: '加班费', field_type: 'currency', visible: false, sort_order: 23 },
  
  // 扣除项
  { field_key: 'pension_insurance', display_name: '养老保险', field_type: 'currency', visible: false, sort_order: 30 },
  { field_key: 'medical_insurance', display_name: '医疗保险', field_type: 'currency', visible: false, sort_order: 31 },
  { field_key: 'unemployment_insurance', display_name: '失业保险', field_type: 'currency', visible: false, sort_order: 32 },
  { field_key: 'housing_fund', display_name: '住房公积金', field_type: 'currency', visible: false, sort_order: 33 },
  { field_key: 'income_tax', display_name: '个人所得税', field_type: 'currency', visible: false, sort_order: 34 },
  
  // 状态和时间
  { field_key: 'payroll_status', display_name: '薪资状态', field_type: 'string', visible: true, sort_order: 40 },
  { field_key: 'pay_month', display_name: '发薪月份', field_type: 'date', visible: false, sort_order: 41 },
  { field_key: 'created_at', display_name: '创建时间', field_type: 'datetime', visible: false, sort_order: 42 },
  { field_key: 'updated_at', display_name: '更新时间', field_type: 'datetime', visible: false, sort_order: 43 },
];

// 模板分类选项
const TEMPLATE_CATEGORIES = [
  { value: 'payroll', label: '薪资报表' },
  { value: 'employee', label: '人员报表' },
  { value: 'department', label: '部门报表' },
  { value: 'statistics', label: '统计报表' }
];

// 输出格式选项
const OUTPUT_FORMATS = [
  { value: 'xlsx', label: 'Excel (XLSX)', icon: '📊' },
  { value: 'csv', label: 'CSV', icon: '📄' },
  { value: 'pdf', label: 'PDF', icon: '📋' }
];

export function ReportTemplateEditor({
  isOpen,
  templateId,
  onClose,
  onSave
}: ReportTemplateEditorProps) {
  const { showSuccess, showError } = useToast();
  const { data: templates } = useReportTemplates();
  const createTemplate = useCreateReportTemplate();
  const updateTemplate = useUpdateReportTemplate();
  
  // 表单状态
  const [formData, setFormData] = useState<{
    template_name: string;
    description: string;
    category: string;
    data_source_key?: string;
    data_source_config?: DataSourceConfig;
    field_mappings: FieldMapping[];
    output_formats: string[];
    is_active: boolean;
    is_scheduled: boolean;
    schedule_config: any;
  }>({
    template_name: '',
    description: '',
    category: 'payroll',
    data_source_key: 'payroll_summary',
    data_source_config: PREDEFINED_DATA_SOURCES.payroll_summary,
    field_mappings: [...AVAILABLE_FIELDS],
    output_formats: ['xlsx'],
    is_active: true,
    is_scheduled: false,
    schedule_config: null
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'datasource' | 'fields' | 'formats' | 'schedule'>('basic');
  const [isSaving, setIsSaving] = useState(false);

  // 动态数据源hooks（必须在formData声明后）
  const { data: dataSources, isLoading: dataSourcesLoading } = useDataSources();
  const { data: tableColumns } = useTableColumns(
    formData.data_source_key || '', 
    !!formData.data_source_key
  );

  // 加载模板数据（编辑模式）
  useEffect(() => {
    if (isOpen && templateId) {
      const template = templates?.find(t => t.id === templateId);
      if (template) {
        setFormData({
          template_name: template.template_name,
          description: template.description || '',
          category: template.category,
          data_source_key: 'payroll_summary', // 默认数据源
          data_source_config: PREDEFINED_DATA_SOURCES.payroll_summary,
          field_mappings: template.field_mappings,
          output_formats: template.output_formats,
          is_active: template.is_active,
          is_scheduled: template.is_scheduled,
          schedule_config: template.schedule_config
        });
      }
    } else if (isOpen && !templateId) {
      // 新建模式，重置表单
      setFormData({
        template_name: '',
        description: '',
        category: 'payroll',
        data_source_key: 'payroll_summary',
        data_source_config: PREDEFINED_DATA_SOURCES.payroll_summary,
        field_mappings: [...AVAILABLE_FIELDS],
        output_formats: ['xlsx'],
        is_active: true,
        is_scheduled: false,
        schedule_config: null
      });
    }
    setActiveTab('basic');
  }, [isOpen, templateId, templates]);

  // 字段可见性切换
  const toggleFieldVisibility = useCallback((fieldKey: string) => {
    setFormData(prev => ({
      ...prev,
      field_mappings: prev.field_mappings.map(field =>
        field.field_key === fieldKey
          ? { ...field, visible: !field.visible }
          : field
      )
    }));
  }, []);

  // 字段排序
  const moveField = useCallback((fieldKey: string, direction: 'up' | 'down') => {
    setFormData(prev => {
      const fields = [...prev.field_mappings];
      const currentIndex = fields.findIndex(f => f.field_key === fieldKey);
      
      if (currentIndex === -1) return prev;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= fields.length) return prev;
      
      // 交换元素
      [fields[currentIndex], fields[newIndex]] = [fields[newIndex], fields[currentIndex]];
      
      // 更新排序值
      fields.forEach((field, index) => {
        field.sort_order = index + 1;
      });
      
      return { ...prev, field_mappings: fields };
    });
  }, []);

  // 输出格式切换
  const toggleOutputFormat = useCallback((format: string) => {
    setFormData(prev => ({
      ...prev,
      output_formats: prev.output_formats.includes(format)
        ? prev.output_formats.filter(f => f !== format)
        : [...prev.output_formats, format]
    }));
  }, []);

  // 数据源切换
  const handleDataSourceChange = useCallback((sourceKey: string) => {
    if (!sourceKey) {
      setFormData(prev => ({
        ...prev,
        data_source_key: '',
        data_source_config: undefined
      }));
      return;
    }

    // 首先尝试使用预定义配置
    let sourceConfig = PREDEFINED_DATA_SOURCES[sourceKey];
    
    // 如果没有预定义配置，动态创建基本配置
    if (!sourceConfig) {
      const dataSource = dataSources?.find(source => source.name === sourceKey);
      if (dataSource) {
        sourceConfig = {
          type: dataSource.type === 'view' ? 'view' : 'table',
          primary_source: sourceKey,
          joins: [],
          filters: [],
          order_by: [
            { field: 'created_at', direction: 'DESC' }
          ]
        };
      }
    }
    
    if (sourceConfig) {
      setFormData(prev => ({
        ...prev,
        data_source_key: sourceKey,
        data_source_config: sourceConfig,
        // 根据数据源推荐分类
        category: getDataSourceCategory(sourceKey)
      }));
    }
  }, [dataSources]);

  // 保存模板
  const handleSave = useCallback(async () => {
    if (!formData.template_name.trim()) {
      showError('请输入模板名称');
      return;
    }

    if (formData.output_formats.length === 0) {
      showError('请至少选择一种输出格式');
      return;
    }

    const visibleFields = formData.field_mappings.filter(f => f.visible);
    if (visibleFields.length === 0) {
      showError('请至少选择一个显示字段');
      return;
    }

    setIsSaving(true);
    try {
      const templateData = {
        template_name: formData.template_name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        field_mappings: formData.field_mappings,
        output_formats: formData.output_formats,
        is_active: formData.is_active,
        is_scheduled: formData.is_scheduled,
        schedule_config: formData.schedule_config
      };

      if (templateId) {
        await updateTemplate.mutateAsync({
          id: templateId,
          ...templateData
        });
        showSuccess('模板更新成功');
      } else {
        await createTemplate.mutateAsync(templateData);
        showSuccess('模板创建成功');
      }

      onSave();
    } catch (error) {
      console.error('Save template error:', error);
      showError(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  }, [formData, templateId, createTemplate, updateTemplate, onSave, showSuccess, showError]);

  if (!isOpen) return null;

  const visibleFieldsCount = formData.field_mappings.filter(f => f.visible).length;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl h-5/6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">
            {templateId ? '编辑报表模板' : '新建报表模板'}
          </h3>
          <button 
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            disabled={isSaving}
          >
            ✕
          </button>
        </div>

        {/* 标签页导航 */}
        <div className="tabs tabs-boxed mb-6">
          <button 
            className={`tab ${activeTab === 'basic' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            基本信息
          </button>
          <button 
            className={`tab ${activeTab === 'datasource' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('datasource')}
          >
            数据源配置
          </button>
          <button 
            className={`tab ${activeTab === 'fields' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('fields')}
          >
            字段配置 ({visibleFieldsCount})
          </button>
          <button 
            className={`tab ${activeTab === 'formats' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('formats')}
          >
            输出格式
          </button>
          <button 
            className={`tab ${activeTab === 'schedule' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            定时设置
          </button>
        </div>

        <div className="modal-content overflow-y-auto max-h-96">
          {/* 基本信息标签页 */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">模板名称 *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="输入模板名称"
                  value={formData.template_name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    template_name: e.target.value
                  }))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">模板描述</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-20"
                  placeholder="输入模板描述..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">模板分类 *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    category: e.target.value
                  }))}
                >
                  {TEMPLATE_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text">启用模板</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      is_active: e.target.checked
                    }))}
                  />
                </label>
              </div>
            </div>
          )}

          {/* 数据源配置标签页 */}
          {activeTab === 'datasource' && (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">选择数据源 *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.data_source_key || ''}
                  onChange={(e) => handleDataSourceChange(e.target.value)}
                  disabled={dataSourcesLoading}
                >
                  <option value="">请选择数据源...</option>
                  {dataSources?.map((source) => (
                    <option key={source.name} value={source.name}>
                      {source.type === 'view' ? '📊' : '📋'} {source.name}
                      {source.comment && ` - ${source.comment}`}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    {dataSourcesLoading ? '正在加载数据源...' : '选择报表的主要数据来源（📊=视图，📋=表）'}
                  </span>
                </label>
              </div>

              {formData.data_source_config && (
                <div className={`${cardEffects.standard} p-4 bg-base-100`}>
                  <h4 className="font-medium mb-3">数据源详情</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-base-content/70">类型</div>
                        <div className="text-sm">{formData.data_source_config.type}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-base-content/70">主数据源</div>
                        <div className="text-sm font-mono">{formData.data_source_config.primary_source}</div>
                      </div>
                    </div>

                    {/* 显示可用字段 */}
                    {tableColumns && tableColumns.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-base-content/70 mb-2">
                          可用字段 ({tableColumns.length})
                        </div>
                        <div className="max-h-32 overflow-y-auto border rounded p-2">
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {tableColumns.map((column) => (
                              <div key={column.column_name} className="flex items-center justify-between">
                                <span className="font-mono">{column.column_name}</span>
                                <span className="text-base-content/60">{column.data_type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {formData.data_source_config.joins && formData.data_source_config.joins.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-base-content/70 mb-2">关联表</div>
                        <div className="space-y-1">
                          {formData.data_source_config.joins.map((join, index) => (
                            <div key={index} className="text-xs bg-base-200 rounded px-2 py-1">
                              <span className="font-mono">{join.type} JOIN {join.table}</span>
                              {join.alias && <span className="text-base-content/60"> AS {join.alias}</span>}
                              <div className="text-base-content/60 mt-1">ON: {join.on}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.data_source_config.aggregations && formData.data_source_config.aggregations.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-base-content/70 mb-2">聚合字段</div>
                        <div className="space-y-1">
                          {formData.data_source_config.aggregations.map((agg, index) => (
                            <div key={index} className="text-xs bg-accent/10 rounded px-2 py-1">
                              <span className="font-mono">{agg.function}({agg.field})</span>
                              {agg.alias && <span className="text-base-content/60"> AS {agg.alias}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.data_source_config.group_by && formData.data_source_config.group_by.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-base-content/70 mb-2">分组字段</div>
                        <div className="flex flex-wrap gap-1">
                          {formData.data_source_config.group_by.map((field, index) => (
                            <span key={index} className="text-xs bg-secondary/20 rounded px-2 py-1 font-mono">
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="alert alert-info">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">
                        {formData.data_source_config.type === 'aggregation' 
                          ? '聚合数据源支持跨表统计分析'
                          : formData.data_source_config.joins 
                          ? `支持跨表查询，包含 ${formData.data_source_config.joins.length} 个关联表`
                          : '单表数据源，性能最优'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 字段配置标签页 */}
          {activeTab === 'fields' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">可用字段</h4>
                <div className="text-sm text-base-content/60">
                  已选择 {visibleFieldsCount} / {formData.field_mappings.length} 个字段
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {formData.field_mappings.map((field, index) => (
                  <div 
                    key={field.field_key} 
                    className={`${cardEffects.standard} p-3 bg-base-100 ${
                      field.visible ? 'ring-1 ring-primary/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary checkbox-sm"
                          checked={field.visible}
                          onChange={() => toggleFieldVisibility(field.field_key)}
                        />
                        <div>
                          <div className="font-medium">{field.display_name}</div>
                          <div className="text-xs text-base-content/60">
                            {field.field_key} - {field.field_type}
                          </div>
                        </div>
                      </div>
                      
                      {field.visible && (
                        <div className="flex items-center gap-1">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => moveField(field.field_key, 'up')}
                            disabled={index === 0}
                            title="上移"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => moveField(field.field_key, 'down')}
                            disabled={index === formData.field_mappings.length - 1}
                            title="下移"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 输出格式标签页 */}
          {activeTab === 'formats' && (
            <div className="space-y-4">
              <h4 className="font-medium">支持的输出格式</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {OUTPUT_FORMATS.map(format => (
                  <div 
                    key={format.value}
                    className={`${cardEffects.standard} p-4 cursor-pointer transition-all ${
                      formData.output_formats.includes(format.value)
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-base-200'
                    }`}
                    onClick={() => toggleOutputFormat(format.value)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        checked={formData.output_formats.includes(format.value)}
                        onChange={() => toggleOutputFormat(format.value)}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{format.icon}</span>
                        <span className="font-medium">{format.label}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 定时设置标签页 */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text">启用定时生成</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={formData.is_scheduled}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      is_scheduled: e.target.checked
                    }))}
                  />
                </label>
              </div>

              {formData.is_scheduled && (
                <div className={`${cardEffects.standard} p-4 bg-base-100`}>
                  <h4 className="font-medium mb-3">定时配置</h4>
                  <div className="alert alert-info">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>定时生成功能将在后续版本中完善</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="modal-action">
          <button 
            className="btn btn-outline"
            onClick={onClose}
            disabled={isSaving}
          >
            取消
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                保存中...
              </>
            ) : (
              templateId ? '更新模板' : '创建模板'
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={!isSaving ? onClose : undefined}>
        <button disabled={isSaving}>close</button>
      </div>
    </div>
  );
}