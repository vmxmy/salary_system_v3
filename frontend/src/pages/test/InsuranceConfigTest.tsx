import React, { useState } from 'react';
import { useInsuranceRuleConfig } from '@/hooks/insurance/useInsuranceConfig';
import InsuranceConfigManager from '@/components/insurance/InsuranceConfigManager';

/**
 * 保险配置管理测试页面
 * 用于测试新开发的保险配置管理功能
 */
const InsuranceConfigTest: React.FC = () => {
  const [showManager, setShowManager] = useState(false);
  const {
    loading,
    error,
    insuranceTypes,
    employeeCategories,
    rules,
    getFlatCategories
  } = useInsuranceRuleConfig();

  // 统计信息
  const stats = {
    insuranceTypesCount: insuranceTypes.length,
    categoriesCount: getFlatCategories().length,
    rulesCount: Array.from(rules.values()).reduce((sum, ruleMap) => sum + ruleMap.size, 0),
    configuredCategories: new Set(
      Array.from(rules.values()).flatMap(ruleMap => Array.from(ruleMap.keys()))
    ).size
  };

  if (showManager) {
    return (
      <div className="min-h-screen">
        <div className="p-4">
          <button
            className="btn btn-ghost mb-4"
            onClick={() => setShowManager(false)}
          >
            ← 返回测试页面
          </button>
        </div>
        <InsuranceConfigManager />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">五险一金配置管理 - 测试页面</h1>

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <span className="loading loading-spinner loading-lg"></span>
          <span className="ml-4">正在加载配置数据...</span>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="alert alert-error mb-6">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>加载失败: {error}</span>
        </div>
      )}

      {/* 数据概览 */}
      {!loading && !error && (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="stat bg-base-100 shadow rounded-lg">
              <div className="stat-title">保险类型</div>
              <div className="stat-value text-primary">{stats.insuranceTypesCount}</div>
              <div className="stat-desc">系统支持的保险种类</div>
            </div>

            <div className="stat bg-base-100 shadow rounded-lg">
              <div className="stat-title">员工类别</div>
              <div className="stat-value text-secondary">{stats.categoriesCount}</div>
              <div className="stat-desc">包含层级结构的所有类别</div>
            </div>

            <div className="stat bg-base-100 shadow rounded-lg">
              <div className="stat-title">配置规则</div>
              <div className="stat-value text-accent">{stats.rulesCount}</div>
              <div className="stat-desc">已配置的保险规则总数</div>
            </div>

            <div className="stat bg-base-100 shadow rounded-lg">
              <div className="stat-title">覆盖类别</div>
              <div className="stat-value text-info">{stats.configuredCategories}</div>
              <div className="stat-desc">已配置保险的员工类别数</div>
            </div>
          </div>

          {/* 启动配置管理器按钮 */}
          <div className="text-center mb-8">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setShowManager(true)}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              启动配置管理器
            </button>
          </div>

          {/* 数据详情 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 保险类型列表 */}
            <div className="bg-base-100 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">保险类型列表</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {insuranceTypes.map(type => (
                  <div key={type.id} className="flex items-center justify-between p-2 bg-base-200 rounded">
                    <div>
                      <span className="font-medium">{type.name}</span>
                      <span className="text-sm text-base-content/60 ml-2">({type.system_key})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge badge-sm ${type.is_active ? 'badge-success' : 'badge-ghost'}`}>
                        {type.is_active ? '启用' : '禁用'}
                      </span>
                      <span className="badge badge-sm badge-info">
                        {rules.get(type.id)?.size || 0} 规则
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 员工类别层级 */}
            <div className="bg-base-100 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">员工类别层级</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {employeeCategories.map(rootCategory => (
                  <div key={rootCategory.id} className="space-y-1">
                    <div className="font-medium text-primary">{rootCategory.name}</div>
                    {rootCategory.children?.map(child => (
                      <div key={child.id} className="ml-4 space-y-1">
                        <div className="text-sm text-secondary">└ {child.name}</div>
                        {child.children?.map(grandChild => (
                          <div key={grandChild.id} className="ml-8 text-xs text-base-content/60">
                            └ {grandChild.name}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 规则配置示例 */}
          {stats.rulesCount > 0 && (
            <div className="mt-8 bg-base-100 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">配置规则示例</h3>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>保险类型</th>
                      <th>员工类别</th>
                      <th>适用性</th>
                      <th>个人费率</th>
                      <th>单位费率</th>
                      <th>基数范围</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(rules.entries())
                      .slice(0, 10) // 只显示前10条
                      .map(([insuranceTypeId, ruleMap]) => {
                        const insuranceType = insuranceTypes.find(t => t.id === insuranceTypeId);
                        return Array.from(ruleMap.entries()).slice(0, 3).map(([categoryId, rule]) => {
                          const category = getFlatCategories().find(c => c.id === categoryId);
                          return (
                            <tr key={`${insuranceTypeId}-${categoryId}`}>
                              <td>{insuranceType?.name || '未知'}</td>
                              <td>{category?.name || '未知'}</td>
                              <td>
                                <span className={`badge badge-sm ${rule.is_applicable ? 'badge-success' : 'badge-warning'}`}>
                                  {rule.is_applicable ? '适用' : '不适用'}
                                </span>
                              </td>
                              <td>{rule.employee_rate ? `${(rule.employee_rate * 100).toFixed(2)}%` : '-'}</td>
                              <td>{rule.employer_rate ? `${(rule.employer_rate * 100).toFixed(2)}%` : '-'}</td>
                              <td>
                                {rule.base_floor || 0} - {rule.base_ceiling || '∞'}
                              </td>
                            </tr>
                          );
                        });
                      })}
                  </tbody>
                </table>
                {stats.rulesCount > 10 && (
                  <div className="text-center mt-4 text-sm text-base-content/60">
                    显示前 10 条规则，共 {stats.rulesCount} 条
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 功能测试提示 */}
          <div className="mt-8 bg-info/10 border border-info/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-info mb-4">功能测试指南</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="badge badge-info badge-sm mt-0.5">1</span>
                <div>
                  <strong>启动配置管理器：</strong>点击上方按钮进入完整的配置管理界面
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge badge-info badge-sm mt-0.5">2</span>
                <div>
                  <strong>选择员工类别：</strong>在左侧树形结构中选择要配置的员工类别
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge badge-info badge-sm mt-0.5">3</span>
                <div>
                  <strong>配置保险规则：</strong>在右侧为选中类别配置各保险类型的适用规则
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge badge-info badge-sm mt-0.5">4</span>
                <div>
                  <strong>批量配置：</strong>使用批量配置功能快速设置多个保险类型
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge badge-info badge-sm mt-0.5">5</span>
                <div>
                  <strong>规则继承：</strong>子类别可以继承父类别的保险配置规则
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InsuranceConfigTest;