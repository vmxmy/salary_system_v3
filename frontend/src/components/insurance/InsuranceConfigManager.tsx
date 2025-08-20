import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useInsuranceRuleConfig } from '@/hooks/insurance/useInsuranceConfig';
import type { EmployeeCategory, InsuranceTypeInfo, InsuranceRuleConfig } from '@/types/insurance';
import EmployeeCategoryTree from './EmployeeCategoryTree';
import InsuranceRuleCard from './InsuranceRuleCard';

interface BatchConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: {
    insurance_type_ids: string[];
    is_applicable: boolean;
    employee_rate?: number;
    employer_rate?: number;
    base_floor?: number;
    base_ceiling?: number;
    inherit_from_parent?: boolean;
  }) => void;
  selectedCategory: EmployeeCategory | null;
  insuranceTypes: InsuranceTypeInfo[];
  loading: boolean;
}

// 批量配置模态框
const BatchConfigModal: React.FC<BatchConfigModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCategory,
  insuranceTypes,
  loading
}) => {
  const [selectedInsuranceTypes, setSelectedInsuranceTypes] = useState<string[]>([]);
  const [config, setConfig] = useState({
    is_applicable: true,
    employee_rate: 0,
    employer_rate: 0,
    base_floor: 0,
    base_ceiling: undefined as number | undefined,
    inherit_from_parent: false
  });

  const handleConfirm = useCallback(() => {
    onConfirm({
      insurance_type_ids: selectedInsuranceTypes,
      ...config
    });
    setSelectedInsuranceTypes([]);
    setConfig({
      is_applicable: true,
      employee_rate: 0,
      employer_rate: 0,
      base_floor: 0,
      base_ceiling: undefined,
      inherit_from_parent: false
    });
  }, [selectedInsuranceTypes, config, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        <h3 className="font-bold text-lg mb-4">
          批量配置保险规则 - {selectedCategory?.name}
        </h3>

        {/* 选择保险类型 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">选择要配置的保险类型</span>
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-base-300 rounded-lg p-3">
            {insuranceTypes.map(type => (
              <label key={type.id} className="cursor-pointer label justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={selectedInsuranceTypes.includes(type.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedInsuranceTypes(prev => [...prev, type.id]);
                    } else {
                      setSelectedInsuranceTypes(prev => prev.filter(id => id !== type.id));
                    }
                  }}
                />
                <span className="label-text">{type.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 配置选项 */}
        <div className="space-y-4">
          {/* 适用性 */}
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="toggle toggle-success"
                checked={config.is_applicable}
                onChange={(e) => setConfig(prev => ({ ...prev, is_applicable: e.target.checked }))}
              />
              <span className="label-text">这些保险类型适用于该员工类别</span>
            </label>
          </div>

          {/* 继承选项 */}
          {selectedCategory?.parent_category_id && (
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-info"
                  checked={config.inherit_from_parent}
                  onChange={(e) => setConfig(prev => ({ ...prev, inherit_from_parent: e.target.checked }))}
                />
                <span className="label-text">从父类别 ({selectedCategory.parent_name}) 继承配置</span>
              </label>
            </div>
          )}

          {/* 费率配置 */}
          {!config.inherit_from_parent && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">个人费率 (%)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    value={config.employee_rate * 100}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      employee_rate: parseFloat(e.target.value) / 100 || 0 
                    }))}
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={!config.is_applicable}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">单位费率 (%)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    value={config.employer_rate * 100}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      employer_rate: parseFloat(e.target.value) / 100 || 0 
                    }))}
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={!config.is_applicable}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">基数下限 (元)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    value={config.base_floor}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      base_floor: parseFloat(e.target.value) || 0 
                    }))}
                    min="0"
                    step="0.01"
                    disabled={!config.is_applicable}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">基数上限 (元)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    value={config.base_ceiling || ''}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      base_ceiling: parseFloat(e.target.value) || undefined 
                    }))}
                    min="0"
                    step="0.01"
                    placeholder="不限制"
                    disabled={!config.is_applicable}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading || selectedInsuranceTypes.length === 0}
          >
            {loading ? '配置中...' : '确认配置'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 保险配置管理器主组件
 * 提供完整的保险类型配置管理界面
 */
const InsuranceConfigManager: React.FC = () => {
  const {
    loading,
    error,
    insuranceTypes,
    employeeCategories,
    rules,
    saveRule,
    batchConfigRules,
    deleteRule,
    getRule,
    getAllChildCategories,
    getFlatCategories,
    clearError
  } = useInsuranceRuleConfig();

  const [selectedCategory, setSelectedCategory] = useState<EmployeeCategory | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // 计算每个类别的规则统计
  const categoryRulesCount = useMemo(() => {
    const count = new Map<string, number>();
    const flatCategories = getFlatCategories();
    
    flatCategories.forEach(category => {
      const categoryRules = Array.from(rules.values()).filter(insuranceRules => 
        insuranceRules.has(category.id)
      );
      count.set(category.id, categoryRules.length);
    });
    
    return count;
  }, [rules, getFlatCategories]);

  // 获取选中类别的父类别规则
  const getParentRules = useCallback((category: EmployeeCategory): Map<string, InsuranceRuleConfig> => {
    const parentRules = new Map<string, InsuranceRuleConfig>();
    
    if (category.parent_category_id) {
      rules.forEach((insuranceRules, insuranceTypeId) => {
        const parentRule = insuranceRules.get(category.parent_category_id!);
        if (parentRule) {
          parentRules.set(insuranceTypeId, parentRule);
        }
      });
    }
    
    return parentRules;
  }, [rules]);

  // 选择类别
  const handleSelectCategory = useCallback((categoryId: string, category: EmployeeCategory) => {
    setSelectedCategory(category);
  }, []);

  // 保存规则
  const handleSaveRule = useCallback(async (rule: InsuranceRuleConfig): Promise<boolean> => {
    const success = await saveRule(rule);
    if (success) {
      // 可以添加成功提示
      console.log('Rule saved successfully');
    }
    return success;
  }, [saveRule]);

  // 删除规则
  const handleDeleteRule = useCallback(async (insuranceTypeId: string, employeeCategoryId: string): Promise<boolean> => {
    const success = await deleteRule(insuranceTypeId, employeeCategoryId);
    if (success) {
      console.log('Rule deleted successfully');
    }
    return success;
  }, [deleteRule]);

  // 批量配置
  const handleBatchConfig = useCallback(async (config: {
    insurance_type_ids: string[];
    is_applicable: boolean;
    employee_rate?: number;
    employer_rate?: number;
    base_floor?: number;
    base_ceiling?: number;
    inherit_from_parent?: boolean;
  }) => {
    if (!selectedCategory) return;

    setBatchLoading(true);
    try {
      for (const insuranceTypeId of config.insurance_type_ids) {
        const success = await batchConfigRules({
          insurance_type_id: insuranceTypeId,
          category_ids: [selectedCategory.id],
          config: {
            is_applicable: config.is_applicable,
            employee_rate: config.employee_rate,
            employer_rate: config.employer_rate,
            base_floor: config.base_floor,
            base_ceiling: config.base_ceiling,
            effective_date: new Date().toISOString().split('T')[0]
          },
          inherit_from_parent: config.inherit_from_parent
        });
        
        if (!success) {
          console.error(`Failed to configure insurance type: ${insuranceTypeId}`);
        }
      }
      
      setShowBatchModal(false);
    } catch (error) {
      console.error('Batch configuration failed:', error);
    } finally {
      setBatchLoading(false);
    }
  }, [selectedCategory, batchConfigRules]);

  // 统计卡片数据
  const statCards = useMemo(() => [
    {
      title: '保险类型',
      value: insuranceTypes.length,
      description: '系统支持的保险类型数量',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      colorClass: 'text-primary'
    },
    {
      title: '员工类别',
      value: getFlatCategories().length,
      description: '可配置的员工类别数量',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      colorClass: 'text-secondary'
    },
    {
      title: '配置规则',
      value: Array.from(rules.values()).reduce((sum, ruleMap) => sum + ruleMap.size, 0),
      description: '已配置的保险规则总数',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      colorClass: 'text-accent'
    }
  ], [insuranceTypes.length, getFlatCategories, rules]);

  // 错误处理
  useEffect(() => {
    if (error) {
      console.error('Insurance config error:', error);
      // 可以添加错误提示组件
    }
  }, [error]);

  if (loading && insuranceTypes.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-4 text-lg">加载保险配置管理...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 页面标题 - 固定区域 */}
      <div className="flex-shrink-0 space-y-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold">五险一金配置管理</h1>
          <p className="text-base-content/60">管理保险类型对各员工类别的适用规则</p>
        </div>

        {/* 统计卡片 - 响应式布局 */}
        <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
          {statCards.map((card, index) => (
            <div key={index} className="stat">
              <div className={`stat-figure ${card.colorClass}`}>
                {card.icon}
              </div>
              <div className="stat-title">{card.title}</div>
              <div className={`stat-value ${card.colorClass}`}>
                {card.value}
              </div>
              <div className="stat-desc">{card.description}</div>
            </div>
          ))}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="alert alert-error">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" onClick={clearError}>
              关闭
            </button>
          </div>
        )}
      </div>

      {/* 主内容区域 - 弹性填充剩余空间 */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6">
          {/* 左侧：员工类别树 */}
          <div className="col-span-4">
            <EmployeeCategoryTree
              categories={employeeCategories}
              selectedCategory={selectedCategory?.id}
              onSelectCategory={handleSelectCategory}
              rulesCount={categoryRulesCount}
              loading={loading}
            />
          </div>

          {/* 右侧：保险规则配置 */}
          <div className="col-span-8">
            {selectedCategory ? (
              <div className="bg-base-100 rounded-lg border border-base-300 h-full flex flex-col">
                {/* 头部 */}
                <div className="p-4 border-b border-base-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedCategory.name}</h3>
                      <p className="text-sm text-base-content/60">
                        {selectedCategory.parent_name && `归属: ${selectedCategory.parent_name} | `}
                        配置此类别的保险规则
                      </p>
                    </div>

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowBatchModal(true)}
                      disabled={loading}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      批量配置
                    </button>
                  </div>
                </div>

                {/* 保险规则卡片列表 */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid gap-4">
                    {insuranceTypes.map(insuranceType => {
                      const rule = getRule(insuranceType.id, selectedCategory.id);
                      const parentRules = getParentRules(selectedCategory);
                      const parentRule = parentRules.get(insuranceType.id);

                      return (
                        <InsuranceRuleCard
                          key={insuranceType.id}
                          insuranceType={insuranceType}
                          category={selectedCategory}
                          rule={rule}
                          parentRule={parentRule}
                          onSave={handleSaveRule}
                          onDelete={rule ? () => handleDeleteRule(insuranceType.id, selectedCategory.id) : undefined}
                          loading={loading}
                          canInherit={!!parentRule}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-base-100 rounded-lg border border-base-300 h-full flex items-center justify-center">
                <div className="text-center text-base-content/60">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">选择员工类别</h3>
                  <p>请在左侧选择一个员工类别以配置其保险规则</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 批量配置模态框 */}
      <BatchConfigModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onConfirm={handleBatchConfig}
        selectedCategory={selectedCategory}
        insuranceTypes={insuranceTypes}
        loading={batchLoading}
      />
    </div>
  );
};

export default InsuranceConfigManager;