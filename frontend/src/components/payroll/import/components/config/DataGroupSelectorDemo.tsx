/**
 * DataGroupSelector 组件演示
 * 用于测试和验证组件功能
 */

import React, { useState } from 'react';
import { DataGroupSelector } from './DataGroupSelector';
import { ImportDataGroup } from '@/types/payroll-import';
import { DATA_GROUP_CONSTANTS } from '../../constants';
import { getDataGroupLabel } from '../../utils/import-helpers';

/**
 * DataGroupSelector 演示组件
 */
export const DataGroupSelectorDemo: React.FC = () => {
  const [selectedDataGroups, setSelectedDataGroups] = useState<ImportDataGroup[]>([
    ImportDataGroup.EARNINGS
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDescriptions, setShowDescriptions] = useState<boolean>(true);
  const [showIcons, setShowIcons] = useState<boolean>(true);

  const handleGroupToggle = (group: ImportDataGroup) => {
    console.log('数据组切换:', group);
    setSelectedDataGroups(prev => {
      if (prev.includes(group)) {
        // 如果已选择，则取消选择
        return prev.filter(g => g !== group);
      } else {
        // 如果未选择，则添加选择
        return [...prev, group];
      }
    });
  };

  const handleSelectAllGroups = () => {
    console.log('全选/取消全选');
    const allGroups = [
      ImportDataGroup.EARNINGS,
      ImportDataGroup.CONTRIBUTION_BASES,
      ImportDataGroup.CATEGORY_ASSIGNMENT,
      ImportDataGroup.JOB_ASSIGNMENT
    ];
    
    const isAllSelected = selectedDataGroups.length === allGroups.length && 
      allGroups.every(group => selectedDataGroups.includes(group));
    
    setSelectedDataGroups(isAllSelected ? [] : allGroups);
  };

  const toggleLoading = () => {
    setLoading(!loading);
  };

  const toggleError = () => {
    if (error) {
      setError(null);
    } else {
      setError('模拟错误状态：无法加载数据类型配置');
    }
  };

  const toggleDescriptions = () => {
    setShowDescriptions(!showDescriptions);
  };

  const toggleIcons = () => {
    setShowIcons(!showIcons);
  };

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-base-content mb-2">
            DataGroupSelector 组件演示
          </h1>
          <p className="text-base-content/70">
            测试薪资导入数据组选择器的各种功能和状态
          </p>
        </div>

        {/* 控制面板 */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">测试控制面板</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                className="btn btn-primary"
                onClick={toggleLoading}
              >
                {loading ? '停止加载' : '开始加载'}
              </button>
              <button 
                className="btn btn-error"
                onClick={toggleError}
              >
                {error ? '清除错误' : '模拟错误'}
              </button>
              <button 
                className="btn btn-info"
                onClick={toggleDescriptions}
              >
                {showDescriptions ? '隐藏描述' : '显示描述'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={toggleIcons}
              >
                {showIcons ? '隐藏图标' : '显示图标'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* DataGroupSelector 组件 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">组件演示</h2>
            <DataGroupSelector
              selectedDataGroups={selectedDataGroups}
              onGroupToggle={handleGroupToggle}
              onSelectAllGroups={handleSelectAllGroups}
              loading={loading}
              error={error}
              showDescriptions={showDescriptions}
              showIcons={showIcons}
            />
          </div>

          {/* 状态和配置信息 */}
          <div className="space-y-6">
            {/* 当前状态 */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">当前状态</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>选中数量:</span>
                    <span className="badge badge-primary">
                      {selectedDataGroups.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>加载状态:</span>
                    <span className={`badge ${loading ? 'badge-warning' : 'badge-success'}`}>
                      {loading ? '加载中' : '就绪'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>错误状态:</span>
                    <span className={`badge ${error ? 'badge-error' : 'badge-success'}`}>
                      {error ? '有错误' : '正常'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>显示描述:</span>
                    <span className={`badge ${showDescriptions ? 'badge-success' : 'badge-ghost'}`}>
                      {showDescriptions ? '是' : '否'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>显示图标:</span>
                    <span className={`badge ${showIcons ? 'badge-success' : 'badge-ghost'}`}>
                      {showIcons ? '是' : '否'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 选中的数据组 */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">已选择的数据组</h2>
                {selectedDataGroups.length === 0 ? (
                  <p className="text-base-content/60">未选择任何数据组</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDataGroups.map((group) => (
                      <div key={group} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {DATA_GROUP_CONSTANTS.ICONS[group]}
                          </span>
                          <div>
                            <div className="font-medium">
                              {DATA_GROUP_CONSTANTS.LABELS[group]}
                            </div>
                            <div className="text-sm text-base-content/60">
                              {DATA_GROUP_CONSTANTS.SHEET_NAMES[group]}
                            </div>
                          </div>
                        </div>
                        <span className={`badge ${DATA_GROUP_CONSTANTS.COLORS[group]}`}>
                          {group}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 数据组配置表 */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">数据组配置</h2>
                <div className="overflow-x-auto">
                  <table className="table table-zebra table-sm">
                    <thead>
                      <tr>
                        <th>数据组</th>
                        <th>标签</th>
                        <th>工作表名</th>
                        <th>图标</th>
                        <th>颜色</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(ImportDataGroup).filter(group => group !== ImportDataGroup.ALL).map((group) => (
                        <tr key={group}>
                          <td>
                            <code className="text-xs">{group}</code>
                          </td>
                          <td>{DATA_GROUP_CONSTANTS.LABELS[group]}</td>
                          <td>{DATA_GROUP_CONSTANTS.SHEET_NAMES[group]}</td>
                          <td className="text-lg">{DATA_GROUP_CONSTANTS.ICONS[group]}</td>
                          <td>
                            <span className={`badge ${DATA_GROUP_CONSTANTS.COLORS[group]} badge-sm`}>
                              样式
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-sm ${
                              selectedDataGroups.includes(group) ? 'badge-success' : 'badge-ghost'
                            }`}>
                              {selectedDataGroups.includes(group) ? '已选' : '未选'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 使用示例 */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">使用示例</h2>
            <div className="mockup-code">
              <pre><code>{`<DataGroupSelector
  selectedDataGroups={selectedDataGroups}
  onGroupToggle={handleGroupToggle}
  onSelectAllGroups={handleSelectAllGroups}
  loading={false}
  error={null}
  showDescriptions={true}
  showIcons={true}
/>`}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataGroupSelectorDemo;