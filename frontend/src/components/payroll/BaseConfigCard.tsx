import React from 'react';

/**
 * 基数配置卡片组件
 * 用于显示和编辑保险配置的基数计算规则
 */

export interface BaseConfig {
  /** 计算方法 */
  method: 'fixed_amount' | 'salary_percentage' | 'monthly_salary' | 'custom_field';
  /** 最小值字段名 */
  min_field?: string;
  /** 最大值字段名 */
  max_field?: string;
  /** 基数百分比 (0-1) */
  percentage?: number;
  /** 四舍五入精度 */
  round_to?: number;
}

export interface BaseConfigCardProps {
  /** 基数配置数据 */
  baseConfig: BaseConfig;
  /** 配置标题 */
  title?: string;
  /** 配置描述 */
  description?: string;
  /** 是否为编辑模式 */
  editable?: boolean;
  /** 基数配置变化时的回调函数 */
  onChange?: (baseConfig: BaseConfig) => void;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否紧凑显示模式 */
  compact?: boolean;
  /** 可用的薪酬字段选项 */
  payrollFields?: Array<{ value: string; label: string; description?: string }>;
  /** 自定义验证错误 */
  errors?: Record<string, string>;
  /** 额外的CSS类名 */
  className?: string;
}

export function BaseConfigCard({
  baseConfig,
  title = "基数配置",
  description,
  editable = false,
  onChange,
  loading = false,
  compact = false,
  payrollFields = [],
  errors = {},
  className = ''
}: BaseConfigCardProps) {

  // 计算方法选项
  const methodOptions = [
    { value: 'fixed_amount', label: '固定金额', description: '使用固定的金额作为基数' },
    { value: 'salary_percentage', label: '工资百分比', description: '按工资的一定百分比计算' },
    { value: 'monthly_salary', label: '月工资', description: '使用员工的月工资作为基数' },
    { value: 'custom_field', label: '自定义字段', description: '使用指定的薪酬字段值' }
  ];

  // 更新基数配置
  const updateConfig = (field: keyof BaseConfig, value: any) => {
    if (!editable || !onChange) return;
    
    const newConfig = {
      ...baseConfig,
      [field]: value
    };
    onChange(newConfig);
  };

  // 获取方法描述
  const getMethodDescription = (method: string) => {
    return methodOptions.find(opt => opt.value === method)?.description || '';
  };

  // 渲染方法选择器
  const renderMethodSelector = () => {
    if (!editable) {
      const selectedMethod = methodOptions.find(opt => opt.value === baseConfig.method);
      return (
        <div className="bg-base-200 p-3 rounded-lg">
          <div className="font-medium text-sm">{selectedMethod?.label}</div>
          <div className="text-xs text-base-content/70 mt-1">
            {selectedMethod?.description}
          </div>
        </div>
      );
    }

    return (
      <div className="form-control">
        <label className="label py-1">
          <span className="label-text font-medium">计算方法 *</span>
        </label>
        <select
          className={`select select-bordered ${errors.method ? 'select-error' : ''}`}
          value={baseConfig.method}
          onChange={(e) => updateConfig('method', e.target.value)}
          disabled={loading}
        >
          {methodOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.method && (
          <div className="text-error text-xs mt-1">{errors.method}</div>
        )}
        <div className="text-xs text-base-content/70 mt-1">
          {getMethodDescription(baseConfig.method)}
        </div>
      </div>
    );
  };

  // 渲染字段选择器
  const renderFieldSelector = (
    field: 'min_field' | 'max_field',
    label: string,
    required = false
  ) => {
    const value = baseConfig[field] || '';
    const hasError = errors[field];

    if (!editable) {
      return (
        <div>
          <div className="text-sm font-medium text-base-content/70">{label}:</div>
          <div className="text-sm">{value || '未设置'}</div>
        </div>
      );
    }

    return (
      <div className="form-control">
        <label className="label py-1">
          <span className="label-text text-sm font-medium">
            {label} {required && <span className="text-error">*</span>}
          </span>
        </label>
        <select
          className={`select select-bordered select-sm ${hasError ? 'select-error' : ''}`}
          value={value}
          onChange={(e) => updateConfig(field, e.target.value || undefined)}
          disabled={loading}
        >
          <option value="">选择字段</option>
          {payrollFields.map(fieldOption => (
            <option key={fieldOption.value} value={fieldOption.value}>
              {fieldOption.label}
            </option>
          ))}
        </select>
        {hasError && (
          <div className="text-error text-xs mt-1">{hasError}</div>
        )}
      </div>
    );
  };

  // 渲染百分比输入
  const renderPercentageInput = () => {
    const value = baseConfig.percentage || 100;
    const hasError = errors.percentage;

    if (!editable) {
      return (
        <div>
          <div className="text-sm font-medium text-base-content/70">基数百分比:</div>
          <div className="text-sm">{value}%</div>
        </div>
      );
    }

    return (
      <div className="form-control">
        <label className="label py-1">
          <span className="label-text text-sm font-medium">基数百分比</span>
        </label>
        <div className="input-group input-group-sm">
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className={`input input-bordered input-sm flex-1 ${hasError ? 'input-error' : ''}`}
            value={value}
            onChange={(e) => updateConfig('percentage', parseFloat(e.target.value) || 100)}
            disabled={loading}
            placeholder="100"
          />
          <span className="bg-base-200 px-2 flex items-center text-sm">%</span>
        </div>
        {hasError && (
          <div className="text-error text-xs mt-1">{hasError}</div>
        )}
      </div>
    );
  };

  // 渲染四舍五入设置
  const renderRoundToInput = () => {
    const value = baseConfig.round_to || 1;
    const hasError = errors.round_to;

    if (!editable) {
      return (
        <div>
          <div className="text-sm font-medium text-base-content/70">四舍五入:</div>
          <div className="text-sm">精确到 {value} 位小数</div>
        </div>
      );
    }

    return (
      <div className="form-control">
        <label className="label py-1">
          <span className="label-text text-sm font-medium">四舍五入精度</span>
        </label>
        <select
          className={`select select-bordered select-sm ${hasError ? 'select-error' : ''}`}
          value={value}
          onChange={(e) => updateConfig('round_to', parseInt(e.target.value) || 1)}
          disabled={loading}
        >
          <option value={1}>整数</option>
          <option value={0.1}>1位小数</option>
          <option value={0.01}>2位小数</option>
        </select>
        {hasError && (
          <div className="text-error text-xs mt-1">{hasError}</div>
        )}
      </div>
    );
  };

  // 渲染配置预览
  const renderConfigPreview = () => {
    if (editable) return null;

    return (
      <div className="bg-base-200 p-3 rounded-lg mt-4">
        <div className="text-sm font-medium mb-2">配置摘要</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {renderPercentageInput()}
          {renderRoundToInput()}
          {baseConfig.min_field && renderFieldSelector('min_field', '最小值字段')}
          {baseConfig.max_field && renderFieldSelector('max_field', '最大值字段')}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`card bg-base-100 shadow ${className}`}>
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div className="skeleton h-4 w-20"></div>
            <div className="skeleton h-4 w-full"></div>
          </div>
          <div className="space-y-3">
            <div className="skeleton h-16 w-full"></div>
            <div className="skeleton h-12 w-full"></div>
            <div className="skeleton h-12 w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card bg-base-100 shadow ${className}`}>
      <div className={`card-body ${compact ? 'p-4' : ''}`}>
        {/* 卡片头部 */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="card-title text-base">{title}</h3>
            {description && (
              <p className="text-sm text-base-content/70 mt-1">{description}</p>
            )}
          </div>
          
          {/* 编辑模式指示 */}
          {editable && (
            <div className="badge badge-outline badge-sm">
              可编辑
            </div>
          )}
        </div>

        {/* 计算方法 */}
        {renderMethodSelector()}

        {/* 详细配置 */}
        <div className={`grid gap-4 mt-4 ${editable ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {/* 百分比和精度设置 */}
          <div className="space-y-3">
            {renderPercentageInput()}
            {renderRoundToInput()}
          </div>

          {/* 字段设置 */}
          <div className="space-y-3">
            {renderFieldSelector('min_field', '最小值字段')}
            {renderFieldSelector('max_field', '最大值字段')}
          </div>
        </div>

        {/* 配置预览 */}
        {renderConfigPreview()}

        {/* 编辑模式下的说明 */}
        {editable && (
          <div className="alert alert-info mt-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="font-medium">基数配置说明:</p>
              <ul className="text-xs mt-1 space-y-1">
                <li>• <strong>固定金额</strong>: 直接使用设定的固定金额</li>
                <li>• <strong>工资百分比</strong>: 按员工工资的百分比计算</li>
                <li>• <strong>月工资</strong>: 使用员工的月度工资总额</li>
                <li>• <strong>自定义字段</strong>: 使用指定的薪酬组件字段值</li>
              </ul>
            </div>
          </div>
        )}

        {/* 配置状态指示器 */}
        {!editable && (
          <div className="flex justify-end mt-4">
            <div className={`badge ${baseConfig.method ? 'badge-success' : 'badge-warning'}`}>
              {baseConfig.method ? '已配置' : '未配置'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 基数配置网格组件
 * 用于同时显示多个基数配置
 */
export interface BaseConfigGridProps {
  /** 基数配置列表 */
  baseConfigs: Array<{
    id: string;
    title: string;
    description?: string;
    baseConfig: BaseConfig;
  }>;
  /** 是否为编辑模式 */
  editable?: boolean;
  /** 基数配置变化时的回调函数 */
  onChange?: (id: string, baseConfig: BaseConfig) => void;
  /** 是否正在加载 */
  loading?: boolean;
  /** 可用的薪酬字段选项 */
  payrollFields?: Array<{ value: string; label: string; description?: string }>;
  /** 网格列数 */
  columns?: 1 | 2 | 3;
  /** 额外的CSS类名 */
  className?: string;
}

export function BaseConfigGrid({
  baseConfigs,
  editable = false,
  onChange,
  loading = false,
  payrollFields = [],
  columns = 2,
  className = ''
}: BaseConfigGridProps) {
  
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }[columns];

  return (
    <div className={`grid gap-4 ${gridCols} ${className}`}>
      {baseConfigs.map((config) => (
        <BaseConfigCard
          key={config.id}
          title={config.title}
          description={config.description}
          baseConfig={config.baseConfig}
          editable={editable}
          onChange={onChange ? (baseConfig) => onChange(config.id, baseConfig) : undefined}
          loading={loading}
          payrollFields={payrollFields}
          compact={true}
        />
      ))}
    </div>
  );
}

export default BaseConfigCard;