import React from 'react';

/**
 * 费率配置卡片组件
 * 用于显示保险配置的费率信息，支持编辑和只读模式
 */

export interface RateConfig {
  /** 个人费率 (0-1 表示百分比) */
  employee: number;
  /** 单位费率 (0-1 表示百分比) */
  employer: number;
  /** 单位补充费率 (0-1 表示百分比) */
  employer_additional?: number;
}

export interface RateConfigCardProps {
  /** 费率配置数据 */
  rates: RateConfig;
  /** 配置标题 */
  title?: string;
  /** 配置描述 */
  description?: string;
  /** 是否为编辑模式 */
  editable?: boolean;
  /** 费率变化时的回调函数 */
  onChange?: (rates: RateConfig) => void;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否显示计算总费率 */
  showTotal?: boolean;
  /** 是否紧凑显示模式 */
  compact?: boolean;
  /** 自定义验证错误 */
  errors?: Record<string, string>;
  /** 额外的CSS类名 */
  className?: string;
}

export function RateConfigCard({
  rates,
  title = "费率配置",
  description,
  editable = false,
  onChange,
  loading = false,
  showTotal = true,
  compact = false,
  errors = {},
  className = ''
}: RateConfigCardProps) {
  
  // 更新费率值
  const updateRate = (field: keyof RateConfig, value: number) => {
    if (!editable || !onChange) return;
    
    const newRates = {
      ...rates,
      [field]: value
    };
    onChange(newRates);
  };

  // 格式化百分比显示
  const formatPercentage = (rate: number) => {
    return (rate * 100).toFixed(2) + '%';
  };

  // 计算总费率
  const getTotalRate = () => {
    const total = rates.employee + rates.employer + (rates.employer_additional || 0);
    return total;
  };

  // 渲染费率输入框
  const renderRateInput = (
    field: keyof RateConfig,
    label: string,
    value: number,
    required = true
  ) => {
    const hasError = errors[field];
    
    if (!editable) {
      return (
        <div className="stat">
          <div className="stat-title text-sm">{label}</div>
          <div className="stat-value text-lg">{formatPercentage(value)}</div>
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
        <div className="input-group input-group-sm">
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className={`input input-bordered input-sm flex-1 ${hasError ? 'input-error' : ''}`}
            value={(value * 100).toFixed(2)}
            onChange={(e) => updateRate(field, parseFloat(e.target.value) / 100 || 0)}
            disabled={loading}
            placeholder="0.00"
          />
          <span className="bg-base-200 px-2 flex items-center text-sm">%</span>
        </div>
        {hasError && (
          <div className="text-error text-xs mt-1">{hasError}</div>
        )}
      </div>
    );
  };

  // 获取费率状态颜色
  const getRateStatusColor = (rate: number) => {
    if (rate === 0) return 'text-base-content/60';
    if (rate < 0.05) return 'text-success';
    if (rate < 0.15) return 'text-warning';
    return 'text-error';
  };

  // 渲染费率统计
  const renderRateStats = () => {
    if (editable || !showTotal) return null;

    const totalRate = getTotalRate();
    
    return (
      <div className="bg-base-200 p-3 rounded-lg mt-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">总费率:</span>
          <span className={`font-bold ${getRateStatusColor(totalRate)}`}>
            {formatPercentage(totalRate)}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
          <div className="flex justify-between">
            <span>个人承担:</span>
            <span className={getRateStatusColor(rates.employee)}>
              {formatPercentage(rates.employee)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>单位承担:</span>
            <span className={getRateStatusColor(rates.employer + (rates.employer_additional || 0))}>
              {formatPercentage(rates.employer + (rates.employer_additional || 0))}
            </span>
          </div>
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
            <div className="skeleton h-16 w-full"></div>
            <div className="skeleton h-16 w-full"></div>
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

        {/* 费率配置 */}
        <div className={`grid gap-4 ${editable ? 'grid-cols-1' : compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {/* 个人费率 */}
          {renderRateInput('employee', '个人费率', rates.employee)}
          
          {/* 单位费率 */}
          {renderRateInput('employer', '单位费率', rates.employer)}
          
          {/* 单位补充费率 */}
          {renderRateInput(
            'employer_additional', 
            '单位补充费率', 
            rates.employer_additional || 0, 
            false
          )}
        </div>

        {/* 费率统计和提示 */}
        {renderRateStats()}
        
        {/* 编辑模式下的提示信息 */}
        {editable && (
          <div className="alert alert-info mt-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="font-medium">费率配置说明:</p>
              <ul className="text-xs mt-1 space-y-1">
                <li>• 费率以百分比形式输入，例如8%输入为8.00</li>
                <li>• 个人费率和单位费率为必填项</li>
                <li>• 单位补充费率为可选项，适用于特殊补充保险</li>
              </ul>
            </div>
          </div>
        )}

        {/* 费率预览（仅在非编辑模式且有总费率时显示） */}
        {!editable && showTotal && (
          <div className="divider my-2">费率分布</div>
        )}
        
        {!editable && showTotal && (
          <div className="flex justify-center">
            <div className="radial-progress text-primary" 
                 style={{"--value": getTotalRate() * 100, "--size": "4rem"} as React.CSSProperties}>
              <span className="text-xs font-bold">
                {formatPercentage(getTotalRate())}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 费率配置卡片组合组件
 * 用于同时显示多个费率配置
 */
export interface RateConfigGridProps {
  /** 费率配置列表 */
  rateConfigs: Array<{
    id: string;
    title: string;
    description?: string;
    rates: RateConfig;
  }>;
  /** 是否为编辑模式 */
  editable?: boolean;
  /** 费率变化时的回调函数 */
  onChange?: (id: string, rates: RateConfig) => void;
  /** 是否正在加载 */
  loading?: boolean;
  /** 网格列数 */
  columns?: 1 | 2 | 3 | 4;
  /** 额外的CSS类名 */
  className?: string;
}

export function RateConfigGrid({
  rateConfigs,
  editable = false,
  onChange,
  loading = false,
  columns = 2,
  className = ''
}: RateConfigGridProps) {
  
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }[columns];

  return (
    <div className={`grid gap-4 ${gridCols} ${className}`}>
      {rateConfigs.map((config) => (
        <RateConfigCard
          key={config.id}
          title={config.title}
          description={config.description}
          rates={config.rates}
          editable={editable}
          onChange={onChange ? (rates) => onChange(config.id, rates) : undefined}
          loading={loading}
          compact={true}
        />
      ))}
    </div>
  );
}

export default RateConfigCard;