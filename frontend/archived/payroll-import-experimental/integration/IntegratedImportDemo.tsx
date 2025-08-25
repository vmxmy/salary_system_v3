/**
 * Hook集成测试组件
 * 集成useImportState和useFileProcessor，展示完整的导入流程
 * 
 * 测试场景：
 * 1. 配置同步 - 导入配置影响文件处理验证
 * 2. 状态联动 - 文件处理进度更新导入状态
 * 3. 数据流转 - 文件解析结果传递给导入状态
 * 4. 错误协调 - 两个Hook的错误状态统一管理
 * 5. 流程控制 - 完整的用户操作流程测试
 */

import React, { useState, useEffect } from 'react';
import { useImportState } from '../../hooks/useImportState';
import { useFileProcessor } from '../../hooks/useFileProcessor';
import { MonthSelector } from '../config/MonthSelector';
import { DataGroupSelector } from '../config/DataGroupSelector';
import { ImportDataGroup, ImportMode } from '@/types/payroll-import';
import type { ImportPhase } from '../../types/enhanced-types';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';
import { DATA_GROUP_CONSTANTS } from '../../constants';

/**
 * 集成测试步骤
 */
type TestStep = 
  | 'config'      // 配置阶段
  | 'file'        // 文件上传阶段  
  | 'validate'    // 验证阶段
  | 'process'     // 处理阶段
  | 'complete';   // 完成阶段

/**
 * 集成测试状态
 */
interface IntegrationTestState {
  currentStep: TestStep;
  stepStartTime: number;
  stepHistory: Array<{
    step: TestStep;
    timestamp: number;
    duration?: number;
    success: boolean;
    errors?: string[];
  }>;
  overallStartTime: number | null;
  isRunning: boolean;
}

/**
 * Hook集成演示组件
 */
export const IntegratedImportDemo: React.FC = () => {
  // Hook实例
  const importState = useImportState();
  const fileProcessor = useFileProcessor();
  
  // 集成测试状态
  const [testState, setTestState] = useState<IntegrationTestState>({
    currentStep: 'config',
    stepStartTime: Date.now(),
    stepHistory: [],
    overallStartTime: null,
    isRunning: false
  });
  
  // 自动化测试控制
  const [autoMode, setAutoMode] = useState(false);
  const [selectedTestScenario, setSelectedTestScenario] = useState<'basic' | 'complex' | 'error'>('basic');

  /**
   * 步骤切换处理
   */
  const moveToStep = (nextStep: TestStep, success: boolean = true, errors?: string[]) => {
    setTestState(prev => {
      const currentTime = Date.now();
      const duration = currentTime - prev.stepStartTime;
      
      const newHistory = [...prev.stepHistory, {
        step: prev.currentStep,
        timestamp: prev.stepStartTime,
        duration,
        success,
        errors
      }];
      
      return {
        ...prev,
        currentStep: nextStep,
        stepStartTime: currentTime,
        stepHistory: newHistory,
        isRunning: nextStep !== 'complete'
      };
    });
  };

  /**
   * 开始集成测试
   */
  const startIntegrationTest = async () => {
    setTestState(prev => ({
      ...prev,
      overallStartTime: Date.now(),
      isRunning: true,
      stepHistory: []
    }));
    
    // 重置所有状态
    importState.resetAll();
    fileProcessor.clearResults();
    
    moveToStep('config');
  };

  /**
   * 配置阶段处理
   */
  const handleConfigStep = () => {
    const configErrors: string[] = [];
    
    // 检查月份配置
    if (!importState.config.selectedMonth) {
      configErrors.push('未选择导入月份');
    }
    
    // 检查数据组配置
    if (importState.config.selectedDataGroups.length === 0) {
      configErrors.push('未选择数据组');
    }
    
    if (configErrors.length > 0) {
      moveToStep('config', false, configErrors);
      return;
    }
    
    // 配置验证通过，移动到文件阶段
    moveToStep('file', true);
  };

  /**
   * 文件处理阶段
   */
  const handleFileStep = async (file: File) => {
    try {
      moveToStep('process');
      
      // 同步进度到导入状态
      await fileProcessor.processFile(file, (phase: ImportPhase, progress: number) => {
        importState.setCurrentPhase(phase);
        importState.updateProgress({
          phase,
          global: {
            totalRecords: 100,
            processedRecords: Math.round((progress / 100) * 100)
          },
          current: {
            groupName: `处理阶段: ${phase}`,
            totalRecords: 100,
            processedRecords: Math.round((progress / 100) * 100)
          },
          currentOperation: `正在${phase}... ${progress}%`,
          isActive: progress < 100
        });
      });
      
      moveToStep('validate', true);
      
    } catch (error) {
      moveToStep('file', false, [error instanceof Error ? error.message : '文件处理失败']);
    }
  };

  /**
   * 验证阶段处理
   */
  const handleValidateStep = () => {
    const validationErrors: string[] = [];
    
    // 检查文件处理结果
    if (!fileProcessor.parseResult) {
      validationErrors.push('文件解析失败');
    } else {
      // 检查是否有全局错误
      if (fileProcessor.parseResult.globalErrors.length > 0) {
        validationErrors.push(...fileProcessor.parseResult.globalErrors);
      }
      
      // 检查数据一致性
      if (fileProcessor.consistencyResult && !fileProcessor.consistencyResult.isConsistent) {
        validationErrors.push('数据一致性检查失败');
      }
      
      // 检查配置匹配
      const configDataTypes = importState.config.selectedDataGroups;
      const fileDataTypes = fileProcessor.parseResult.dataTypes;
      const missingTypes = configDataTypes.filter(type => !fileDataTypes.includes(type));
      
      if (missingTypes.length > 0) {
        validationErrors.push(`文件中缺少配置的数据类型: ${missingTypes.join(', ')}`);
      }
    }
    
    if (validationErrors.length > 0) {
      moveToStep('validate', false, validationErrors);
      return;
    }
    
    moveToStep('complete', true);
  };

  /**
   * 自动化测试场景
   */
  const runAutoTest = async (scenario: 'basic' | 'complex' | 'error') => {
    setAutoMode(true);
    await startIntegrationTest();
    
    // 根据场景设置配置
    switch (scenario) {
      case 'basic':
        importState.updateSelectedMonth('2025-01');
        importState.updateSelectedDataGroups([ImportDataGroup.EARNINGS]);
        break;
      
      case 'complex':
        importState.updateSelectedMonth('2025-01');
        importState.updateSelectedDataGroups([
          ImportDataGroup.EARNINGS,
          ImportDataGroup.CONTRIBUTION_BASES,
          ImportDataGroup.CATEGORY_ASSIGNMENT
        ]);
        break;
      
      case 'error':
        // 故意留空配置来测试错误处理
        break;
    }
    
    setTimeout(() => {
      handleConfigStep();
      setAutoMode(false);
    }, 1000);
  };

  /**
   * 获取步骤状态样式
   */
  const getStepStyle = (step: TestStep) => {
    const isActive = testState.currentStep === step;
    const isCompleted = testState.stepHistory.some(h => h.step === step && h.success);
    const hasFailed = testState.stepHistory.some(h => h.step === step && !h.success);
    
    if (hasFailed) return 'step-error';
    if (isCompleted) return 'step-success';
    if (isActive) return 'step-active';
    return 'step-pending';
  };

  /**
   * 获取整体测试统计
   */
  const getTestStatistics = () => {
    const history = testState.stepHistory;
    const successCount = history.filter(h => h.success).length;
    const errorCount = history.filter(h => !h.success).length;
    const totalTime = testState.overallStartTime ? Date.now() - testState.overallStartTime : 0;
    
    return {
      totalSteps: history.length,
      successCount,
      errorCount,
      totalTime,
      averageStepTime: history.length > 0 ? totalTime / history.length : 0
    };
  };

  const stats = getTestStatistics();

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-base-content mb-2">
            🔧 Hook集成测试中心
          </h1>
          <p className="text-base-content/70">
            useImportState + useFileProcessor 协同工作验证
          </p>
        </div>

        {/* 测试控制面板 */}
        <div className={cn(cardEffects.elevated, 'p-6')}>
          <h2 className="text-xl font-bold mb-4">测试控制面板</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <button 
              className="btn btn-primary"
              onClick={startIntegrationTest}
              disabled={testState.isRunning}
            >
              {testState.isRunning ? '测试进行中...' : '开始集成测试'}
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={() => runAutoTest('basic')}
              disabled={testState.isRunning}
            >
              自动测试-基础
            </button>
            
            <button 
              className="btn btn-accent"
              onClick={() => runAutoTest('complex')}
              disabled={testState.isRunning}
            >
              自动测试-复杂
            </button>
            
            <button 
              className="btn btn-warning"
              onClick={() => runAutoTest('error')}
              disabled={testState.isRunning}
            >
              错误测试场景
            </button>
          </div>
          
          {/* 测试统计 */}
          <div className="stats stats-horizontal shadow-sm">
            <div className="stat">
              <div className="stat-title">总步骤</div>
              <div className="stat-value text-lg">{stats.totalSteps}</div>
            </div>
            <div className="stat">
              <div className="stat-title">成功</div>
              <div className="stat-value text-lg text-success">{stats.successCount}</div>
            </div>
            <div className="stat">
              <div className="stat-title">失败</div>
              <div className="stat-value text-lg text-error">{stats.errorCount}</div>
            </div>
            <div className="stat">
              <div className="stat-title">总时长</div>
              <div className="stat-value text-lg">{(stats.totalTime / 1000).toFixed(1)}s</div>
            </div>
          </div>
        </div>

        {/* 测试流程步骤 */}
        <div className={cn(cardEffects.standard, 'p-6')}>
          <h2 className="text-xl font-bold mb-4">测试流程步骤</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {(['config', 'file', 'validate', 'process', 'complete'] as TestStep[]).map((step, index) => {
              const stepStyle = getStepStyle(step);
              const stepHistory = testState.stepHistory.find(h => h.step === step);
              
              return (
                <div 
                  key={step}
                  className={`card bg-base-200 ${stepStyle === 'step-active' ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">
                        步骤 {index + 1}
                      </span>
                      <span className={`badge badge-sm ${
                        stepStyle === 'step-success' ? 'badge-success' :
                        stepStyle === 'step-error' ? 'badge-error' :
                        stepStyle === 'step-active' ? 'badge-primary' : 'badge-ghost'
                      }`}>
                        {stepStyle === 'step-success' ? '✓' :
                         stepStyle === 'step-error' ? '✗' :
                         stepStyle === 'step-active' ? '⚡' : '○'}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-sm mb-1">
                      {step === 'config' && '配置设置'}
                      {step === 'file' && '文件上传'}
                      {step === 'validate' && '数据验证'}
                      {step === 'process' && '处理执行'}
                      {step === 'complete' && '完成'}
                    </h4>
                    
                    {stepHistory && (
                      <div className="text-xs text-base-content/60">
                        {stepHistory.duration && (
                          <div>耗时: {stepHistory.duration}ms</div>
                        )}
                        {stepHistory.errors && stepHistory.errors.length > 0 && (
                          <div className="text-error mt-1">
                            {stepHistory.errors.map((error, i) => (
                              <div key={i}>• {error}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 配置面板 - useImportState */}
          <div className="space-y-6">
            <div className={cn(cardEffects.primary, 'p-6')}>
              <h3 className="text-lg font-bold mb-4">📋 导入配置 (useImportState)</h3>
              
              {/* 月份选择 */}
              <div className="mb-4">
                <MonthSelector
                  selectedMonth={importState.config.selectedMonth}
                  onMonthChange={importState.updateSelectedMonth}
                  availableMonths={[
                    { month: '2025-01', payrollCount: 150, hasData: true, hasPeriod: true },
                    { month: '2025-02', payrollCount: 145, hasData: true, hasPeriod: false },
                    { month: '2024-12', payrollCount: 160, hasData: true, hasPeriod: true }
                  ]}
                />
              </div>

              {/* 数据组选择 */}
              <div className="mb-4">
                <DataGroupSelector
                  selectedDataGroups={importState.config.selectedDataGroups}
                  onGroupToggle={importState.toggleDataGroup}
                  onSelectAllGroups={importState.selectAllDataGroups}
                />
              </div>

              {/* 导入模式 */}
              <div className="mb-4">
                <label className="label">
                  <span className="label-text">导入模式</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={importState.config.importMode}
                  onChange={(e) => importState.updateImportMode(e.target.value as ImportMode)}
                >
                  <option value={ImportMode.UPSERT}>更新插入</option>
                  <option value={ImportMode.REPLACE}>替换</option>
                </select>
              </div>

              {/* 配置状态 */}
              <div className="stats stats-vertical shadow-sm bg-base-100">
                <div className="stat py-2">
                  <div className="stat-title text-xs">配置状态</div>
                  <div className={`stat-value text-sm ${importState.isConfigValid ? 'text-success' : 'text-error'}`}>
                    {importState.isConfigValid ? '✓ 有效' : '✗ 无效'}
                  </div>
                </div>
                <div className="stat py-2">
                  <div className="stat-title text-xs">准备状态</div>
                  <div className={`stat-value text-sm ${importState.isReadyForImport ? 'text-success' : 'text-warning'}`}>
                    {importState.isReadyForImport ? '✓ 就绪' : '⚠ 未就绪'}
                  </div>
                </div>
              </div>

              {/* 测试操作按钮 */}
              <div className="flex gap-2 mt-4">
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={handleConfigStep}
                  disabled={testState.currentStep !== 'config'}
                >
                  验证配置
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={importState.resetAll}
                >
                  重置配置
                </button>
              </div>
            </div>

            {/* 进度监控 */}
            <div className={cn(cardEffects.standard, 'p-6')}>
              <h3 className="text-lg font-bold mb-4">⚡ 进度监控</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>当前阶段:</span>
                  <span className={`badge ${importState.isProcessing ? 'badge-warning' : 'badge-success'}`}>
                    {importState.currentPhaseDescription}
                  </span>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>整体进度</span>
                    <span>{importState.progressPercentage}%</span>
                  </div>
                  <progress 
                    className="progress progress-primary w-full" 
                    value={importState.progressPercentage} 
                    max="100"
                  />
                </div>

                {importState.progress.currentOperation && (
                  <div className="text-sm text-base-content/70">
                    {importState.progress.currentOperation}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 文件处理面板 - useFileProcessor */}
          <div className="space-y-6">
            <div className={cn(cardEffects.accent, 'p-6')}>
              <h3 className="text-lg font-bold mb-4">📁 文件处理 (useFileProcessor)</h3>
              
              {/* 文件上传 */}
              <div className="mb-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && testState.currentStep === 'file') {
                      handleFileStep(file);
                    }
                  }}
                  className="file-input file-input-bordered w-full"
                  disabled={testState.currentStep !== 'file'}
                />
              </div>

              {/* 文件信息 */}
              {fileProcessor.fileState.file && (
                <div className="bg-base-200 p-3 rounded mb-4">
                  <div className="text-sm space-y-1">
                    <div><strong>文件名:</strong> {fileProcessor.fileState.fileName}</div>
                    <div><strong>大小:</strong> {(fileProcessor.fileState.fileSize / 1024).toFixed(1)} KB</div>
                    <div><strong>状态:</strong> 
                      <span className={`ml-2 badge badge-sm ${
                        fileProcessor.isProcessing ? 'badge-warning' : 'badge-success'
                      }`}>
                        {fileProcessor.isProcessing ? '处理中' : '就绪'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 解析结果统计 */}
              {fileProcessor.parseResult && (
                <div className="stats stats-vertical shadow-sm bg-base-100">
                  <div className="stat py-2">
                    <div className="stat-title text-xs">工作表数</div>
                    <div className="stat-value text-sm">{fileProcessor.parseResult.sheets.length}</div>
                  </div>
                  <div className="stat py-2">
                    <div className="stat-title text-xs">数据行数</div>
                    <div className="stat-value text-sm">{fileProcessor.parseResult.validRows}</div>
                  </div>
                  <div className="stat py-2">
                    <div className="stat-title text-xs">员工数量</div>
                    <div className="stat-value text-sm">{fileProcessor.parseResult.employeeCount}</div>
                  </div>
                  <div className="stat py-2">
                    <div className="stat-title text-xs">数据类型</div>
                    <div className="stat-value text-sm">{fileProcessor.parseResult.dataTypes.length}</div>
                  </div>
                </div>
              )}

              {/* 数据一致性 */}
              {fileProcessor.consistencyResult && (
                <div className={`alert ${fileProcessor.consistencyResult.isConsistent ? 'alert-success' : 'alert-warning'} mt-4`}>
                  <span className="text-sm">
                    数据一致性: {fileProcessor.consistencyResult.isConsistent ? '✓ 通过' : '⚠ 有问题'}
                  </span>
                </div>
              )}

              {/* 测试操作按钮 */}
              <div className="flex gap-2 mt-4">
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={handleValidateStep}
                  disabled={testState.currentStep !== 'validate'}
                >
                  验证数据
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={fileProcessor.clearResults}
                >
                  清除文件
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 集成状态面板 */}
        <div className={cn(cardEffects.primary, 'p-6')}>
          <h2 className="text-xl font-bold mb-4">🔄 集成状态监控</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Hook状态对比 */}
            <div>
              <h4 className="font-medium mb-2">Hook状态对比</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>ImportState.isProcessing:</span>
                  <span className={importState.isProcessing ? 'text-warning' : 'text-success'}>
                    {importState.isProcessing ? '是' : '否'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>FileProcessor.isProcessing:</span>
                  <span className={fileProcessor.isProcessing ? 'text-warning' : 'text-success'}>
                    {fileProcessor.isProcessing ? '是' : '否'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>状态同步:</span>
                  <span className={importState.isProcessing === fileProcessor.isProcessing ? 'text-success' : 'text-error'}>
                    {importState.isProcessing === fileProcessor.isProcessing ? '✓ 一致' : '✗ 不一致'}
                  </span>
                </div>
              </div>
            </div>

            {/* 错误状态汇总 */}
            <div>
              <h4 className="font-medium mb-2">错误状态汇总</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>配置错误:</span>
                  <span className={importState.hasErrors ? 'text-error' : 'text-success'}>
                    {importState.validation.errors.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>文件错误:</span>
                  <span className={fileProcessor.hasErrors ? 'text-error' : 'text-success'}>
                    {fileProcessor.parseResult?.globalErrors.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>整体状态:</span>
                  <span className={(!importState.hasErrors && !fileProcessor.hasErrors) ? 'text-success' : 'text-error'}>
                    {(!importState.hasErrors && !fileProcessor.hasErrors) ? '✓ 正常' : '✗ 有错误'}
                  </span>
                </div>
              </div>
            </div>

            {/* 数据匹配度 */}
            <div>
              <h4 className="font-medium mb-2">配置数据匹配</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span>配置数据组: </span>
                  <span>{importState.config.selectedDataGroups.length}</span>
                </div>
                <div>
                  <span>文件数据类型: </span>
                  <span>{fileProcessor.parseResult?.dataTypes.length || 0}</span>
                </div>
                <div>
                  <span>匹配度: </span>
                  <span className={(() => {
                    if (!fileProcessor.parseResult) return 'text-base-content/50';
                    const configTypes = importState.config.selectedDataGroups;
                    const fileTypes = fileProcessor.parseResult.dataTypes;
                    const matchCount = configTypes.filter(type => fileTypes.includes(type)).length;
                    const matchRate = configTypes.length > 0 ? (matchCount / configTypes.length) * 100 : 0;
                    return matchRate === 100 ? 'text-success' : matchRate > 50 ? 'text-warning' : 'text-error';
                  })()}>
                    {(() => {
                      if (!fileProcessor.parseResult) return '等待文件';
                      const configTypes = importState.config.selectedDataGroups;
                      const fileTypes = fileProcessor.parseResult.dataTypes;
                      const matchCount = configTypes.filter(type => fileTypes.includes(type)).length;
                      const matchRate = configTypes.length > 0 ? (matchCount / configTypes.length) * 100 : 0;
                      return `${matchRate.toFixed(0)}%`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedImportDemo;