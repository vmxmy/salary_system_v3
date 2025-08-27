/**
 * 薪资组件详情查看模态框
 * 显示薪资组件的完整信息
 */

import React from 'react';
import { format } from 'date-fns';
import { 
  type SalaryComponent,
  type CopyStrategy,
  type StabilityLevel,
  COMPONENT_TYPE_CONFIG,
  COMPONENT_CATEGORY_CONFIG,
  COPY_STRATEGY_CONFIG,
  STABILITY_LEVEL_CONFIG,
} from '@/hooks/salary-components';

interface SalaryComponentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: SalaryComponent | null;
  onEdit?: (component: SalaryComponent) => void;
}

export function SalaryComponentDetailModal({
  isOpen,
  onClose,
  component,
  onEdit,
}: SalaryComponentDetailModalProps) {
  if (!isOpen || !component) return null;

  const typeConfig = COMPONENT_TYPE_CONFIG[component.type];
  const categoryConfig = component.category ? COMPONENT_CATEGORY_CONFIG[component.category] : null;
  const copyStrategyConfig = component.copy_strategy ? COPY_STRATEGY_CONFIG[component.copy_strategy as CopyStrategy] : null;
  const stabilityConfig = component.stability_level ? STABILITY_LEVEL_CONFIG[component.stability_level as StabilityLevel] : null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl h-screen max-h-screen p-0 flex flex-col">
        {/* Header */}
        <div className="navbar bg-base-100 border-b">
          <div className="flex-1">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className={typeConfig.color}>{typeConfig.icon}</span>
              薪资组件详情
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
          {/* 基本信息 */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <h4 className="card-title">基本信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">组件名称</span>
                  </label>
                  <div className="text-lg font-semibold">{component.name}</div>
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">组件ID</span>
                  </label>
                  <div className="font-mono text-sm opacity-70">{component.id}</div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">组件类型</span>
                  </label>
                  <div className={`flex items-center gap-2 ${typeConfig.color}`}>
                    <span>{typeConfig.icon}</span>
                    <span className="font-medium">{typeConfig.label}</span>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">组件类别</span>
                  </label>
                  <div>
                    {categoryConfig ? (
                      <>
                        <div className={`badge ${categoryConfig.color}`}>
                          {categoryConfig.label}
                        </div>
                        <div className="text-xs opacity-60 mt-1">
                          {categoryConfig.description}
                        </div>
                      </>
                    ) : (
                      <div className="badge badge-neutral">未分类</div>
                    )}
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">创建时间</span>
                  </label>
                  <div className="text-sm">
                    {format(new Date(component.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                </div>
              </div>

              {component.description && (
                <div className="form-control mt-4">
                  <label className="label">
                    <span className="label-text">描述说明</span>
                  </label>
                  <div className="mockup-code text-sm">
                    <pre><code>{component.description}</code></pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 属性配置 */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <h4 className="card-title">属性配置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="stats shadow">
                  <div className="stat">
                    <div className="stat-title">税务属性</div>
                    <div className="stat-desc">是否需要缴纳个人所得税</div>
                    <div className="stat-value text-sm">
                      <div className={`badge ${component.is_taxable ? 'badge-warning' : 'badge-success'}`}>
                        {component.is_taxable ? '应税' : '免税'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="stats shadow">
                  <div className="stat">
                    <div className="stat-title">基数依赖</div>
                    <div className="stat-desc">是否依赖五险一金基数</div>
                    <div className="stat-value text-sm">
                      <div className={`badge ${component.base_dependency ? 'badge-info' : 'badge-neutral'}`}>
                        {component.base_dependency ? '是' : '否'}
                      </div>
                    </div>
                  </div>
                </div>

                {copyStrategyConfig && (
                  <div className="stats shadow">
                    <div className="stat">
                      <div className="stat-title">复制策略</div>
                      <div className="stat-desc">{copyStrategyConfig.description}</div>
                      <div className="stat-value text-sm">
                        <div className="badge badge-primary">
                          {copyStrategyConfig.label}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {stabilityConfig && (
                  <div className="stats shadow">
                    <div className="stat">
                      <div className="stat-title">稳定性级别</div>
                      <div className="stat-desc">{stabilityConfig.description}</div>
                      <div className="stat-value text-sm">
                        <div className={`badge ${stabilityConfig.color}`}>
                          {stabilityConfig.label}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 复制说明 */}
          {component.copy_notes && (
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h4 className="card-title">复制说明</h4>
                <div className="mockup-code">
                  <pre><code>{component.copy_notes}</code></pre>
                </div>
              </div>
            </div>
          )}

          {/* 系统信息 */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <h4 className="card-title">系统信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">组件ID</span>
                  </label>
                  <div className="font-mono text-sm">{component.id}</div>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">创建时间</span>
                  </label>
                  <div className="text-sm">{format(new Date(component.created_at), 'yyyy-MM-dd HH:mm:ss')}</div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="navbar bg-base-100 border-t">
          <div className="navbar-end w-full">
            <div className="flex gap-2">
              <button className="btn" onClick={onClose}>
                关闭
              </button>
              {onEdit && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    onEdit(component);
                    onClose();
                  }}
                >
                  编辑
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}