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
      <div className="modal-box w-11/12 max-w-2xl">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className={typeConfig.color}>{typeConfig.icon}</span>
          薪资组件详情
        </h3>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="card bg-base-200/50">
            <div className="card-body">
              <h4 className="card-title text-base mb-3">基本信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-base-content/70">组件名称</label>
                  <div className="mt-1 font-semibold text-lg">{component.name}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-base-content/70">组件ID</label>
                  <div className="mt-1 font-mono text-sm text-base-content/80">{component.id}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-base-content/70">组件类型</label>
                  <div className={`mt-1 flex items-center gap-2 ${typeConfig.color}`}>
                    <span>{typeConfig.icon}</span>
                    <span className="font-medium">{typeConfig.label}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-base-content/70">组件类别</label>
                  <div className="mt-1">
                    {categoryConfig ? (
                      <>
                        <div className={`badge ${categoryConfig.color}`}>
                          {categoryConfig.label}
                        </div>
                        <div className="text-xs text-base-content/60 mt-1">
                          {categoryConfig.description}
                        </div>
                      </>
                    ) : (
                      <div className="badge badge-neutral">未分类</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-base-content/70">创建时间</label>
                  <div className="mt-1 text-sm">
                    {format(new Date(component.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                </div>
              </div>

              {component.description && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-base-content/70">描述说明</label>
                  <div className="mt-1 text-sm bg-base-100 p-3 rounded-md">
                    {component.description}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 属性配置 */}
          <div className="card bg-base-200/50">
            <div className="card-body">
              <h4 className="card-title text-base mb-3">属性配置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                  <div>
                    <div className="font-medium">税务属性</div>
                    <div className="text-xs text-base-content/60">
                      是否需要缴纳个人所得税
                    </div>
                  </div>
                  <div className={`badge ${component.is_taxable ? 'badge-warning' : 'badge-success'}`}>
                    {component.is_taxable ? '应税' : '免税'}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                  <div>
                    <div className="font-medium">基数依赖</div>
                    <div className="text-xs text-base-content/60">
                      是否依赖五险一金基数
                    </div>
                  </div>
                  <div className={`badge ${component.base_dependency ? 'badge-info' : 'badge-neutral'}`}>
                    {component.base_dependency ? '是' : '否'}
                  </div>
                </div>

                {copyStrategyConfig && (
                  <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                    <div>
                      <div className="font-medium">复制策略</div>
                      <div className="text-xs text-base-content/60">
                        {copyStrategyConfig.description}
                      </div>
                    </div>
                    <div className="badge badge-primary">
                      {copyStrategyConfig.label}
                    </div>
                  </div>
                )}

                {stabilityConfig && (
                  <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                    <div>
                      <div className="font-medium">稳定性级别</div>
                      <div className="text-xs text-base-content/60">
                        {stabilityConfig.description}
                      </div>
                    </div>
                    <div className={`badge ${stabilityConfig.color}`}>
                      {stabilityConfig.label}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 复制说明 */}
          {component.copy_notes && (
            <div className="card bg-base-200/50">
              <div className="card-body">
                <h4 className="card-title text-base mb-3">复制说明</h4>
                <div className="bg-base-100 p-4 rounded-md text-sm">
                  {component.copy_notes}
                </div>
              </div>
            </div>
          )}

          {/* 系统信息 */}
          <div className="card bg-base-200/50">
            <div className="card-body">
              <h4 className="card-title text-base mb-3">系统信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-base-content/70">组件ID:</span>
                  <span className="ml-2 font-mono">{component.id}</span>
                </div>
                <div>
                  <span className="text-base-content/70">创建时间:</span>
                  <span className="ml-2">{format(new Date(component.created_at), 'yyyy-MM-dd HH:mm:ss')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="modal-action">
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
  );
}