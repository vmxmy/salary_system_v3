/**
 * DataGroupSelector 独立测试组件
 * 解决在renderComponent中无法使用useState的问题
 */

import React, { useState } from 'react';
import { DataGroupSelector } from './config/DataGroupSelector';
import { ImportDataGroup } from '@/types/payroll-import';

/**
 * DataGroupSelector测试组件
 */
export const DataGroupSelectorTest: React.FC = () => {
  const [selectedGroups, setSelectedGroups] = useState<ImportDataGroup[]>([ImportDataGroup.EARNINGS]);
  
  const handleGroupToggle = (group: ImportDataGroup) => {
    setSelectedGroups(prev => {
      const newGroups = prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group];
      console.log('数据组状态变更:', { group, newGroups });
      return newGroups;
    });
  };
  
  const handleSelectAllGroups = () => {
    const allGroups = [
      ImportDataGroup.EARNINGS,
      ImportDataGroup.CONTRIBUTION_BASES,
      ImportDataGroup.CATEGORY_ASSIGNMENT,
      ImportDataGroup.JOB_ASSIGNMENT
    ];
    const newGroups = selectedGroups.length === allGroups.length ? [] : allGroups;
    console.log('全选/取消全选:', newGroups);
    setSelectedGroups(newGroups);
  };
  
  return (
    <div className="p-4 bg-base-100 rounded-lg border">
      {/* 调试信息 */}
      <div className="mb-4 p-2 bg-info/10 rounded text-sm">
        <strong>当前状态:</strong> 已选择 {selectedGroups.length} 个数据组
        <br />
        <strong>选中的组:</strong> {selectedGroups.join(', ') || '无'}
      </div>
      
      <DataGroupSelector
        selectedDataGroups={selectedGroups}
        onGroupToggle={handleGroupToggle}
        onSelectAllGroups={handleSelectAllGroups}
        showDescriptions={true}
        showIcons={true}
      />
      
      {/* 测试按钮 */}
      <div className="mt-4 space-x-2">
        <button 
          className="btn btn-sm btn-primary"
          onClick={() => {
            console.log('测试点击: 选择薪资数据组');
            handleGroupToggle(ImportDataGroup.EARNINGS);
          }}
        >
          测试选择薪资
        </button>
        <button 
          className="btn btn-sm btn-secondary"
          onClick={() => {
            console.log('测试点击: 清空所有选择');
            setSelectedGroups([]);
          }}
        >
          清空选择
        </button>
        <button 
          className="btn btn-sm btn-accent"
          onClick={() => {
            console.log('测试点击: 选择缴费基数组');
            handleGroupToggle(ImportDataGroup.CONTRIBUTION_BASES);
          }}
        >
          测试选择缴费基数
        </button>
      </div>
      
      {/* 功能说明 */}
      <div className="mt-4 p-3 bg-warning/10 rounded text-sm">
        <h4 className="font-semibold text-warning">🔍 调试说明</h4>
        <ul className="list-disc list-inside space-y-1 mt-2 text-xs">
          <li>直接点击数据组卡片进行选择/取消</li>
          <li>使用"全部选择"按钮切换全选状态</li>
          <li>观察调试信息区域的状态变化</li>
          <li>使用测试按钮验证程序化操作</li>
          <li>查看浏览器控制台的详细日志</li>
        </ul>
      </div>
    </div>
  );
};

export default DataGroupSelectorTest;