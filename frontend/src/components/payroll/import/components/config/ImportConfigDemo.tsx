/**
 * 导入配置组合演示
 * 展示MonthSelector和DataGroupSelector协同工作的完整配置流程
 */

import React, { useState, useEffect } from 'react';
import { MonthSelector } from './MonthSelector';
import { DataGroupSelector } from './DataGroupSelector';
import { ImportDataGroup } from '@/types/payroll-import';
import { type AvailablePayrollMonth } from '@/hooks/payroll';
import { getDataGroupLabel, getExpectedSheets, validateExcelFile } from '../../utils/import-helpers';
import { DATA_GROUP_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants';
import { cardEffects } from '@/styles/design-effects';
import { useModal } from '@/components/common/Modal';
import { cn } from '@/lib/utils';

// 模拟数据
const mockAvailableMonths: AvailablePayrollMonth[] = [
  {
    month: '2024-12',
    payrollCount: 45,
    hasData: true,
    hasPeriod: true,
    expectedEmployeeCount: 50
  },
  {
    month: '2025-01', 
    payrollCount: 48,
    hasData: true,
    hasPeriod: true,
    expectedEmployeeCount: 50
  },
  {
    month: '2025-02',
    payrollCount: 0,
    hasData: false,
    hasPeriod: true,
    expectedEmployeeCount: 50
  }
];

/**
 * 导入配置状态接口
 */
interface ImportConfigState {
  selectedMonth: string;
  selectedDataGroups: ImportDataGroup[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 导入配置组合演示组件
 */
export const ImportConfigDemo: React.FC = () => {
  const modal = useModal();
  
  // 配置状态
  const [config, setConfig] = useState<ImportConfigState>({
    selectedMonth: '2025-01',
    selectedDataGroups: [ImportDataGroup.EARNINGS],
    isValid: false,
    errors: [],
    warnings: []
  });

  // UI状态
  const [loading, setLoading] = useState<boolean>(false);
  const [simulateError, setSimulateError] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // 处理月份变更
  const handleMonthChange = (month: string) => {
    console.log('月份变更:', month);
    setConfig(prev => ({
      ...prev,
      selectedMonth: month
    }));
  };

  // 处理数据组切换
  const handleGroupToggle = (group: ImportDataGroup) => {
    console.log('数据组切换:', group);
    setConfig(prev => {
      const newGroups = prev.selectedDataGroups.includes(group)
        ? prev.selectedDataGroups.filter(g => g !== group)
        : [...prev.selectedDataGroups, group];
      
      return {
        ...prev,
        selectedDataGroups: newGroups
      };
    });
  };

  // 处理全选数据组
  const handleSelectAllGroups = () => {
    console.log('全选数据组');
    const allGroups = [
      ImportDataGroup.EARNINGS,
      ImportDataGroup.CONTRIBUTION_BASES,
      ImportDataGroup.CATEGORY_ASSIGNMENT,
      ImportDataGroup.JOB_ASSIGNMENT
    ];
    
    const isAllSelected = config.selectedDataGroups.length === allGroups.length && 
      allGroups.every(group => config.selectedDataGroups.includes(group));
    
    setConfig(prev => ({
      ...prev,
      selectedDataGroups: isAllSelected ? [] : allGroups
    }));
  };

  // 验证配置
  const validateConfig = (configState: ImportConfigState): ImportConfigState => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证月份选择
    if (!configState.selectedMonth) {
      errors.push('请选择薪资周期');
    }

    // 验证数据组选择
    if (configState.selectedDataGroups.length === 0) {
      errors.push('请至少选择一种数据类型');
    }

    // 模拟错误状态
    if (simulateError) {
      errors.push('模拟错误：无法连接到服务器');
    }

    // 检查月份数据状态
    const monthData = mockAvailableMonths.find(m => m.month === configState.selectedMonth);
    if (monthData && monthData.hasData && configState.selectedDataGroups.length > 0) {
      warnings.push(`${configState.selectedMonth} 月份已有薪资数据，导入将覆盖现有数据`);
    }

    // 检查数据组匹配
    if (configState.selectedDataGroups.length > 2) {
      warnings.push('选择多种数据类型将需要更多时间完成导入');
    }

    return {
      ...configState,
      errors,
      warnings,
      isValid: errors.length === 0
    };
  };

  // 配置变更时自动验证
  useEffect(() => {
    const validatedConfig = validateConfig(config);
    if (JSON.stringify(validatedConfig) !== JSON.stringify(config)) {
      setConfig(validatedConfig);
    }
  }, [config.selectedMonth, config.selectedDataGroups, simulateError]);

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateExcelFile(file);
    if (validation.isValid) {
      setUploadedFile(file);
      console.log('文件上传成功:', file.name);
    } else {
      modal.showError(`文件验证失败: ${validation.error || '未知错误'}`);
    }
  };

  // 模拟导入操作
  const handleSimulateImport = async () => {
    if (!config.isValid) return;
    
    setLoading(true);
    console.log('开始模拟导入:', config);
    
    // 模拟异步操作
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLoading(false);
    modal.showSuccess('模拟导入完成！');
  };

  // 获取期望的工作表
  const expectedSheets = getExpectedSheets(config.selectedDataGroups);

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-base-content mb-2">
            📋 导入配置组合演示
          </h1>
          <p className="text-base-content/70">
            展示MonthSelector和DataGroupSelector协同工作的完整配置流程
          </p>
        </div>

        {/* 控制面板 */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">测试控制面板</h2>
            <div className="flex flex-wrap gap-4">
              <button 
                className="btn btn-primary"
                onClick={() => setLoading(!loading)}
              >
                {loading ? '停止加载' : '模拟加载'}
              </button>
              <button 
                className="btn btn-error"
                onClick={() => setSimulateError(!simulateError)}
              >
                {simulateError ? '清除错误' : '模拟错误'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setConfig({
                  selectedMonth: '2025-01',
                  selectedDataGroups: [],
                  isValid: false,
                  errors: [],
                  warnings: []
                })}
              >
                重置配置
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主配置区域 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 月份选择器 */}
            <MonthSelector
              selectedMonth={config.selectedMonth}
              onMonthChange={handleMonthChange}
              availableMonths={mockAvailableMonths}
              loading={loading}
              error={config.errors.find(e => e.includes('周期')) || null}
              showDataIndicators={true}
              showCompletenessIndicators={true}
            />

            {/* 数据组选择器 */}
            <DataGroupSelector
              selectedDataGroups={config.selectedDataGroups}
              onGroupToggle={handleGroupToggle}
              onSelectAllGroups={handleSelectAllGroups}
              loading={loading}
              error={config.errors.find(e => e.includes('数据类型')) || null}
              showDescriptions={true}
              showIcons={true}
            />

            {/* 文件上传区域 */}
            <div className={cn(cardEffects.standard, 'p-6')}>
              <h3 className="text-lg font-medium text-base-content mb-4">
                📁 文件上传
              </h3>
              
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="file-input file-input-bordered w-full"
                  disabled={loading || !config.isValid}
                />
                
                {uploadedFile && (
                  <div className="alert alert-success">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>文件已上传: {uploadedFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 操作区域 */}
            <div className="flex gap-4">
              <button
                className="btn btn-primary flex-1"
                onClick={handleSimulateImport}
                disabled={loading || !config.isValid || !uploadedFile}
              >
                {loading && <span className="loading loading-spinner"></span>}
                {loading ? '导入中...' : '开始导入'}
              </button>
              <button
                className="btn btn-outline"
                disabled={loading}
              >
                预览数据
              </button>
            </div>
          </div>

          {/* 状态信息面板 */}
          <div className="space-y-6">
            {/* 配置状态 */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">配置状态</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>配置有效性:</span>
                    <span className={`badge ${config.isValid ? 'badge-success' : 'badge-error'}`}>
                      {config.isValid ? '✓ 有效' : '✗ 无效'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>选中月份:</span>
                    <code className="bg-base-300 px-2 py-1 rounded text-sm">
                      {config.selectedMonth}
                    </code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>数据组数量:</span>
                    <span className="badge badge-primary">
                      {config.selectedDataGroups.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>错误数量:</span>
                    <span className={`badge ${config.errors.length > 0 ? 'badge-error' : 'badge-success'}`}>
                      {config.errors.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>警告数量:</span>
                    <span className={`badge ${config.warnings.length > 0 ? 'badge-warning' : 'badge-success'}`}>
                      {config.warnings.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 选中的数据组 */}
            {config.selectedDataGroups.length > 0 && (
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">选中数据组</h2>
                  <div className="space-y-2">
                    {config.selectedDataGroups.map((group) => (
                      <div key={group} className="flex items-center justify-between p-2 bg-base-100 rounded">
                        <span className="text-sm font-medium">
                          {DATA_GROUP_CONSTANTS.LABELS[group]}
                        </span>
                        <span className={`badge ${DATA_GROUP_CONSTANTS.COLORS[group]} badge-sm`}>
                          {DATA_GROUP_CONSTANTS.ICONS[group]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 期望工作表 */}
            {expectedSheets.length > 0 && (
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">期望工作表</h2>
                  <div className="space-y-1">
                    {expectedSheets.map((sheet) => (
                      <div key={sheet} className="flex items-center gap-2">
                        <span className="text-success text-sm">📊</span>
                        <span className="text-sm">{sheet}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-base-content/60 mt-2">
                    Excel文件应包含以上工作表
                  </p>
                </div>
              </div>
            )}

            {/* 错误和警告 */}
            {(config.errors.length > 0 || config.warnings.length > 0) && (
              <div className="space-y-3">
                {config.errors.length > 0 && (
                  <div className="alert alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-bold">配置错误</h4>
                      <ul className="text-sm mt-1">
                        {config.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {config.warnings.length > 0 && (
                  <div className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="font-bold">警告信息</h4>
                      <ul className="text-sm mt-1">
                        {config.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 配置摘要 */}
        <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">配置摘要</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="stat">
                <div className="stat-title">薪资周期</div>
                <div className="stat-value text-primary text-lg">{config.selectedMonth}</div>
              </div>
              <div className="stat">
                <div className="stat-title">数据类型</div>
                <div className="stat-value text-secondary text-lg">{config.selectedDataGroups.length}</div>
              </div>
              <div className="stat">
                <div className="stat-title">工作表数</div>
                <div className="stat-value text-accent text-lg">{expectedSheets.length}</div>
              </div>
              <div className="stat">
                <div className="stat-title">状态</div>
                <div className={`stat-value text-lg ${config.isValid ? 'text-success' : 'text-error'}`}>
                  {config.isValid ? '就绪' : '待完善'}
                </div>
              </div>
            </div>
            
            {config.isValid && (
              <div className="mt-4 p-4 bg-success/10 rounded-lg border border-success/20">
                <p className="text-success font-medium">
                  ✅ 配置完成，可以开始导入操作
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal组件 */}
      {modal.AlertModal}
      {modal.ConfirmModal}
    </div>
  );
};

export default ImportConfigDemo;