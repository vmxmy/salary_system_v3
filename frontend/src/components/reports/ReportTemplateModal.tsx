/**
 * 报表模板创建/编辑模态框
 * 
 * 按照用户架构设计：
 * 1. 选择数据源（动态加载数据库表和视图）
 * 2. 选择字段（从数据源中选择需要的字段）
 * 3. 字段映射（设置字段的显示名称和配置）
 * 4. 预览确认（预览配置效果）
 */

import { useState, useEffect } from 'react';
import { useDataSourcesEnhanced, useTableColumnsEnhanced, type DataSourceEnhanced, type ColumnInfoEnhanced } from '@/hooks/reports/useDataSources';
import { getRecommendedFields } from '@/hooks/reports/useDataSources';

// 字段映射配置接口
interface FieldMappingConfig {
  original_field: string;    // 数据库原始字段名
  display_name: string;      // 用户设置的显示名称
  width: number;             // 显示宽度
  visible: boolean;          // 是否在报表中显示
  sortable: boolean;         // 是否可排序
  format?: string;           // 数据格式化规则（可选）
}

// 模板配置接口
interface TemplateConfig {
  template_name: string;
  template_key: string;
  description: string;
  category: string;
  data_source: string;       // 选择的数据源
  field_mappings: FieldMappingConfig[];
  config: {
    groupBy?: string[];
    orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
    filters?: Record<string, any>;
  };
}

// 模态框步骤枚举
type ModalStep = 'data-source' | 'field-selection' | 'field-mapping' | 'preview';

interface ReportTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: TemplateConfig) => void;
  editingTemplate?: any; // 编辑模式时的现有模板数据
  mode: 'create' | 'edit';
}

export default function ReportTemplateModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingTemplate, 
  mode 
}: ReportTemplateModalProps) {
  const [currentStep, setCurrentStep] = useState<ModalStep>('data-source');
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>({
    template_name: '',
    template_key: '',
    description: '',
    category: 'payroll',
    data_source: '',
    field_mappings: [],
    config: {
      orderBy: []
    }
  });

  // 数据源查询
  const { data: dataSources = [], isLoading: sourcesLoading } = useDataSourcesEnhanced({
    enableRealQuery: true
  });

  // 字段查询（当选择数据源后）
  const { 
    data: availableFields = [], 
    isLoading: fieldsLoading 
  } = useTableColumnsEnhanced(
    templateConfig.data_source, 
    !!templateConfig.data_source
  );

  // 初始化编辑模式数据
  useEffect(() => {
    if (mode === 'edit' && editingTemplate) {
      setTemplateConfig({
        template_name: editingTemplate.template_name || '',
        template_key: editingTemplate.template_key || '',
        description: editingTemplate.description || '',
        category: editingTemplate.category || 'payroll',
        data_source: '', // 需要从现有配置中推导
        field_mappings: editingTemplate.field_mappings || [],
        config: editingTemplate.config || { orderBy: [] }
      });
    }
  }, [mode, editingTemplate]);

  // 重置模态框状态
  const resetModal = () => {
    setCurrentStep('data-source');
    setTemplateConfig({
      template_name: '',
      template_key: '',
      description: '',
      category: 'payroll',
      data_source: '',
      field_mappings: [],
      config: { orderBy: [] }
    });
  };

  // 处理数据源选择
  const handleDataSourceSelect = (dataSource: DataSourceEnhanced) => {
    setTemplateConfig(prev => ({
      ...prev,
      data_source: dataSource.table_name,
      field_mappings: [] // 清空之前的字段选择
    }));
    setCurrentStep('field-selection');
  };

  // 处理字段选择
  const handleFieldToggle = (field: ColumnInfoEnhanced) => {
    setTemplateConfig(prev => {
      const existingIndex = prev.field_mappings.findIndex(
        mapping => mapping.original_field === field.column_name
      );

      if (existingIndex >= 0) {
        // 移除字段
        return {
          ...prev,
          field_mappings: prev.field_mappings.filter((_, index) => index !== existingIndex)
        };
      } else {
        // 添加字段
        const newMapping: FieldMappingConfig = {
          original_field: field.column_name,
          display_name: field.display_name || field.column_name,
          width: getDefaultFieldWidth(field.data_type),
          visible: true,
          sortable: !field.column_name.includes('id'),
          format: getDefaultFieldFormat(field.data_type)
        };
        return {
          ...prev,
          field_mappings: [...prev.field_mappings, newMapping]
        };
      }
    });
  };

  // 快速选择推荐字段
  const handleSelectRecommended = () => {
    const recommendedFields = getRecommendedFields(templateConfig.data_source);
    const newMappings = availableFields
      .filter(field => recommendedFields.includes(field.column_name))
      .map((field): FieldMappingConfig => ({
        original_field: field.column_name,
        display_name: field.display_name || field.column_name,
        width: getDefaultFieldWidth(field.data_type),
        visible: true,
        sortable: !field.column_name.includes('id'),
        format: getDefaultFieldFormat(field.data_type)
      }));

    setTemplateConfig(prev => ({
      ...prev,
      field_mappings: newMappings
    }));
  };

  // 处理字段映射配置更新
  const handleFieldMappingUpdate = (index: number, updates: Partial<FieldMappingConfig>) => {
    setTemplateConfig(prev => ({
      ...prev,
      field_mappings: prev.field_mappings.map((mapping, i) => 
        i === index ? { ...mapping, ...updates } : mapping
      )
    }));
  };

  // 保存模板
  const handleSave = () => {
    // 生成模板key（如果为空）
    if (!templateConfig.template_key) {
      const key = templateConfig.template_name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      setTemplateConfig(prev => ({ ...prev, template_key: key }));
    }

    onSave(templateConfig);
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 模态框头部 */}
        <div className="flex justify-between items-center p-6 border-b border-base-300">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === 'create' ? '创建报表模板' : '编辑报表模板'}
            </h2>
            <p className="text-base-content/70 mt-1">
              {getStepDescription(currentStep)}
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              resetModal();
              onClose();
            }}
          >
            ✕
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="p-6 border-b border-base-300">
          <ul className="steps w-full">
            <li className={`step ${currentStep === 'data-source' || getStepNumber(currentStep) > 0 ? 'step-primary' : ''}`}>
              选择数据源
            </li>
            <li className={`step ${getStepNumber(currentStep) > 1 ? 'step-primary' : ''}`}>
              选择字段
            </li>
            <li className={`step ${getStepNumber(currentStep) > 2 ? 'step-primary' : ''}`}>
              字段映射
            </li>
            <li className={`step ${getStepNumber(currentStep) > 3 ? 'step-primary' : ''}`}>
              预览确认
            </li>
          </ul>
        </div>

        {/* 模态框内容 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* 步骤1: 数据源选择 */}
          {currentStep === 'data-source' && (
            <DataSourceSelectionStep
              dataSources={dataSources}
              loading={sourcesLoading}
              selectedDataSource={templateConfig.data_source}
              onSelect={handleDataSourceSelect}
            />
          )}

          {/* 步骤2: 字段选择 */}
          {currentStep === 'field-selection' && (
            <FieldSelectionStep
              availableFields={availableFields}
              selectedFields={templateConfig.field_mappings}
              loading={fieldsLoading}
              onFieldToggle={handleFieldToggle}
              onSelectRecommended={handleSelectRecommended}
              dataSource={templateConfig.data_source}
            />
          )}

          {/* 步骤3: 字段映射配置 */}
          {currentStep === 'field-mapping' && (
            <FieldMappingStep
              fieldMappings={templateConfig.field_mappings}
              onUpdate={handleFieldMappingUpdate}
              templateConfig={templateConfig}
              onTemplateUpdate={setTemplateConfig}
            />
          )}

          {/* 步骤4: 预览确认 */}
          {currentStep === 'preview' && (
            <PreviewStep
              templateConfig={templateConfig}
              onTemplateUpdate={setTemplateConfig}
            />
          )}
        </div>

        {/* 模态框底部操作栏 */}
        <div className="flex justify-between items-center p-6 border-t border-base-300">
          <div>
            {currentStep !== 'data-source' && (
              <button
                className="btn btn-outline"
                onClick={() => {
                  const steps: ModalStep[] = ['data-source', 'field-selection', 'field-mapping', 'preview'];
                  const currentIndex = steps.indexOf(currentStep);
                  if (currentIndex > 0) {
                    setCurrentStep(steps[currentIndex - 1]);
                  }
                }}
              >
                上一步
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => {
                resetModal();
                onClose();
              }}
            >
              取消
            </button>
            
            {currentStep === 'preview' ? (
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!templateConfig.template_name || templateConfig.field_mappings.length === 0}
              >
                {mode === 'create' ? '创建模板' : '更新模板'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => {
                  const steps: ModalStep[] = ['data-source', 'field-selection', 'field-mapping', 'preview'];
                  const currentIndex = steps.indexOf(currentStep);
                  if (currentIndex < steps.length - 1) {
                    setCurrentStep(steps[currentIndex + 1]);
                  }
                }}
                disabled={!canProceedToNextStep(currentStep, templateConfig)}
              >
                下一步
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 数据源选择步骤组件
function DataSourceSelectionStep({ 
  dataSources, 
  loading, 
  selectedDataSource, 
  onSelect 
}: {
  dataSources: DataSourceEnhanced[];
  loading: boolean;
  selectedDataSource: string;
  onSelect: (dataSource: DataSourceEnhanced) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 获取所有分类
  const categories = ['all', ...Array.from(new Set(dataSources.map(ds => ds.category || '其他')))];

  // 过滤数据源
  const filteredSources = dataSources.filter(ds => {
    const matchesSearch = ds.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ds.table_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ds.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">正在加载数据源...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">选择报表数据源</h3>
        <p className="text-base-content/70 mb-6">
          选择作为报表基础的数据表或视图。系统会自动发现所有可用的数据源。
        </p>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="搜索数据源..."
            className="input input-bordered w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="select select-bordered"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? '全部分类' : category}
            </option>
          ))}
        </select>
      </div>

      {/* 数据源网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSources.map((dataSource) => (
          <div
            key={`${dataSource.schema_name}.${dataSource.table_name}`}
            className={`card bg-base-200 cursor-pointer transition-all hover:shadow-lg ${
              selectedDataSource === dataSource.table_name ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSelect(dataSource)}
          >
            <div className="card-body p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-base">
                    {dataSource.display_name || dataSource.table_name}
                  </h4>
                  <p className="text-sm text-base-content/70 mt-1">
                    {dataSource.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`badge badge-sm ${
                      dataSource.table_type === 'view' ? 'badge-info' : 'badge-success'
                    }`}>
                      {dataSource.table_type === 'view' ? '视图' : '表'}
                    </div>
                    <div className="badge badge-sm badge-outline">
                      {dataSource.category}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-base-content/50">
                    {dataSource.schema_name}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSources.length === 0 && (
        <div className="text-center py-8">
          <div className="text-base-content/50">
            {searchTerm || selectedCategory !== 'all' ? 
              '没有找到匹配的数据源' : 
              '暂无可用的数据源'
            }
          </div>
        </div>
      )}
    </div>
  );
}

// 字段选择步骤组件
function FieldSelectionStep({ 
  availableFields, 
  selectedFields, 
  loading, 
  onFieldToggle, 
  onSelectRecommended,
  dataSource 
}: {
  availableFields: ColumnInfoEnhanced[];
  selectedFields: FieldMappingConfig[];
  loading: boolean;
  onFieldToggle: (field: ColumnInfoEnhanced) => void;
  onSelectRecommended: () => void;
  dataSource: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 获取字段分类
  const fieldCategories = ['all', ...Array.from(new Set(availableFields.map(f => f.category || '其他字段')))];

  // 过滤字段
  const filteredFields = availableFields.filter(field => {
    const matchesSearch = field.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         field.column_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || field.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 获取推荐字段
  const recommendedFieldNames = getRecommendedFields(dataSource);
  const recommendedFields = filteredFields.filter(field => 
    recommendedFieldNames.includes(field.column_name)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">正在加载字段信息...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">选择报表字段</h3>
        <p className="text-base-content/70 mb-6">
          从 <code className="bg-base-200 px-2 py-1 rounded">{dataSource}</code> 中选择需要在报表中显示的字段。
          系统已为您标识了关键字段和推荐字段组合。
        </p>
      </div>

      {/* 快速操作和筛选 */}
      <div className="flex gap-4 items-center">
        <button
          className="btn btn-outline btn-sm"
          onClick={onSelectRecommended}
          disabled={recommendedFields.length === 0}
        >
          选择推荐字段 ({recommendedFields.length})
        </button>
        <div className="flex-1">
          <input
            type="text"
            placeholder="搜索字段..."
            className="input input-bordered input-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="select select-bordered select-sm"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {fieldCategories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? '全部字段' : category}
            </option>
          ))}
        </select>
      </div>

      {/* 已选字段概览 */}
      {selectedFields.length > 0 && (
        <div className="bg-base-200 rounded-lg p-4">
          <h4 className="font-medium mb-2">已选字段 ({selectedFields.length})</h4>
          <div className="flex flex-wrap gap-2">
            {selectedFields.map((field) => (
              <div key={field.original_field} className="badge badge-primary">
                {field.display_name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 字段列表 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredFields.map((field) => {
          const isSelected = selectedFields.some(sf => sf.original_field === field.column_name);
          const isRecommended = recommendedFieldNames.includes(field.column_name);

          return (
            <div
              key={field.column_name}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-base-400 hover:bg-base-50'
              }`}
              onClick={() => onFieldToggle(field)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={isSelected}
                  onChange={() => onFieldToggle(field)}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {field.display_name || field.column_name}
                    </span>
                    {field.is_key && (
                      <div className="badge badge-warning badge-xs">关键</div>
                    )}
                    {isRecommended && (
                      <div className="badge badge-success badge-xs">推荐</div>
                    )}
                  </div>
                  <div className="text-sm text-base-content/60 flex items-center gap-2">
                    <span>{field.column_name}</span>
                    <span className="badge badge-ghost badge-xs">{field.data_type}</span>
                    {field.category && (
                      <span className="badge badge-outline badge-xs">{field.category}</span>
                    )}
                  </div>
                  {field.description && (
                    <div className="text-xs text-base-content/50 mt-1">
                      {field.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFields.length === 0 && (
        <div className="text-center py-8">
          <div className="text-base-content/50">
            {searchTerm || selectedCategory !== 'all' ? 
              '没有找到匹配的字段' : 
              '该数据源没有可用字段'
            }
          </div>
        </div>
      )}
    </div>
  );
}

// 字段映射配置步骤组件
function FieldMappingStep({ 
  fieldMappings, 
  onUpdate, 
  templateConfig, 
  onTemplateUpdate 
}: {
  fieldMappings: FieldMappingConfig[];
  onUpdate: (index: number, updates: Partial<FieldMappingConfig>) => void;
  templateConfig: TemplateConfig;
  onTemplateUpdate: (config: TemplateConfig) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">字段映射配置</h3>
        <p className="text-base-content/70 mb-6">
          为每个字段设置显示名称、宽度和其他配置选项。这些设置将影响最终报表的外观。
        </p>
      </div>

      {/* 模板基本信息 */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h4 className="card-title text-base">模板基本信息</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">模板名称 *</span>
              </label>
              <input
                type="text"
                placeholder="例如：月度薪资汇总表"
                className="input input-bordered w-full"
                value={templateConfig.template_name}
                onChange={(e) => onTemplateUpdate({
                  ...templateConfig,
                  template_name: e.target.value
                })}
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">模板分类</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={templateConfig.category}
                onChange={(e) => onTemplateUpdate({
                  ...templateConfig,
                  category: e.target.value
                })}
              >
                <option value="payroll">薪资管理</option>
                <option value="employee">员工管理</option>
                <option value="department">部门管理</option>
                <option value="statistics">统计分析</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">
                <span className="label-text">描述信息</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="简要描述这个报表模板的用途..."
                value={templateConfig.description}
                onChange={(e) => onTemplateUpdate({
                  ...templateConfig,
                  description: e.target.value
                })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 字段配置 */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h4 className="card-title text-base">字段配置</h4>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>原字段名</th>
                  <th>显示名称</th>
                  <th>宽度</th>
                  <th>显示</th>
                  <th>排序</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {fieldMappings.map((mapping, index) => (
                  <tr key={mapping.original_field}>
                    <td>
                      <code className="text-xs">{mapping.original_field}</code>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input input-xs input-bordered w-full max-w-xs"
                        value={mapping.display_name}
                        onChange={(e) => onUpdate(index, { display_name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input input-xs input-bordered w-20"
                        value={mapping.width}
                        onChange={(e) => onUpdate(index, { width: parseInt(e.target.value) || 100 })}
                        min="50"
                        max="300"
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={mapping.visible}
                        onChange={(e) => onUpdate(index, { visible: e.target.checked })}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={mapping.sortable}
                        onChange={(e) => onUpdate(index, { sortable: e.target.checked })}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-xs btn-error btn-outline"
                        onClick={() => {
                          onTemplateUpdate({
                            ...templateConfig,
                            field_mappings: fieldMappings.filter((_, i) => i !== index)
                          });
                        }}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// 预览步骤组件
function PreviewStep({ 
  templateConfig, 
  onTemplateUpdate 
}: {
  templateConfig: TemplateConfig;
  onTemplateUpdate: (config: TemplateConfig) => void;
}) {
  // 生成模板key（如果未设置）
  useEffect(() => {
    if (!templateConfig.template_key && templateConfig.template_name) {
      const key = templateConfig.template_name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      onTemplateUpdate({
        ...templateConfig,
        template_key: key
      });
    }
  }, [templateConfig.template_name, templateConfig.template_key, onTemplateUpdate]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">预览确认</h3>
        <p className="text-base-content/70 mb-6">
          请确认模板配置信息，点击"创建模板"完成模板创建。
        </p>
      </div>

      {/* 模板概览 */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h4 className="card-title text-base">模板概览</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-base-content/70">模板名称：</span>
              <span className="ml-2">{templateConfig.template_name}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-base-content/70">模板标识：</span>
              <code className="ml-2 text-sm">{templateConfig.template_key}</code>
            </div>
            <div>
              <span className="text-sm font-medium text-base-content/70">数据源：</span>
              <code className="ml-2 text-sm">{templateConfig.data_source}</code>
            </div>
            <div>
              <span className="text-sm font-medium text-base-content/70">字段数量：</span>
              <span className="ml-2">{templateConfig.field_mappings.length} 个字段</span>
            </div>
          </div>
          {templateConfig.description && (
            <div className="mt-4">
              <span className="text-sm font-medium text-base-content/70">描述：</span>
              <p className="mt-1 text-sm">{templateConfig.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* 字段配置预览 */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h4 className="card-title text-base">报表字段预览</h4>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  {templateConfig.field_mappings
                    .filter(mapping => mapping.visible)
                    .map((mapping, index) => (
                      <th 
                        key={mapping.original_field}
                        style={{ width: `${mapping.width}px` }}
                        className="text-center border"
                      >
                        {mapping.display_name}
                        {mapping.sortable && (
                          <span className="ml-1 text-xs text-base-content/50">↕</span>
                        )}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {templateConfig.field_mappings
                    .filter(mapping => mapping.visible)
                    .map((mapping) => (
                      <td 
                        key={mapping.original_field}
                        className="text-center text-base-content/50 border"
                      >
                        示例数据
                      </td>
                    ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// 工具函数
function getStepDescription(step: ModalStep): string {
  const descriptions = {
    'data-source': '选择报表数据来源',
    'field-selection': '选择需要显示的字段',
    'field-mapping': '配置字段显示属性',
    'preview': '预览和确认模板配置'
  };
  return descriptions[step];
}

function getStepNumber(step: ModalStep): number {
  const steps: ModalStep[] = ['data-source', 'field-selection', 'field-mapping', 'preview'];
  return steps.indexOf(step);
}

function canProceedToNextStep(step: ModalStep, config: TemplateConfig): boolean {
  switch (step) {
    case 'data-source':
      return !!config.data_source;
    case 'field-selection':
      return config.field_mappings.length > 0;
    case 'field-mapping':
      return !!config.template_name && config.field_mappings.length > 0;
    default:
      return true;
  }
}

function getDefaultFieldWidth(dataType: string): number {
  if (dataType.includes('text') || dataType.includes('varchar')) return 120;
  if (dataType.includes('numeric') || dataType.includes('decimal')) return 100;
  if (dataType.includes('date') || dataType.includes('timestamp')) return 110;
  if (dataType.includes('boolean')) return 80;
  return 100;
}

function getDefaultFieldFormat(dataType: string): string | undefined {
  if (dataType.includes('numeric') || dataType.includes('decimal')) return 'number';
  if (dataType.includes('date') || dataType.includes('timestamp')) return 'date';
  if (dataType.includes('boolean')) return 'boolean';
  return undefined;
}