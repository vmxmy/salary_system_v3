/**
 * useImportState Hook 演示组件
 * 展示集中化状态管理的完整功能
 */

import React, { useState, useEffect } from 'react';
import { useImportState } from '../../hooks/useImportState';
import { ImportDataGroup, ImportMode } from '@/types/payroll-import';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';
import { DATA_GROUP_CONSTANTS } from '../../constants';

/**
 * useImportState Hook 演示组件
 */
export const ImportStateDemo: React.FC = () => {
  const importState = useImportState();
  const [simulateProgress, setSimulateProgress] = useState(false);

  // 模拟进度更新
  useEffect(() => {
    if (!simulateProgress) return;

    const phases: Array<typeof importState.progress.phase> = [
      'parsing', 'validating', 'importing', 'creating_payrolls', 'inserting_items', 'completed'
    ];
    
    let currentPhaseIndex = 0;
    let progress = 0;

    const interval = setInterval(() => {
      const phase = phases[currentPhaseIndex];
      
      if (phase === 'completed') {
        importState.setCurrentPhase(phase);
        importState.updateProgress({
          phase,
          global: { totalRecords: 100, processedRecords: 100 },
          current: { groupName: '完成', totalRecords: 100, processedRecords: 100 },
          isActive: false,
          currentOperation: '导入完成'
        });
        setSimulateProgress(false);
        clearInterval(interval);
        return;
      }

      importState.setCurrentPhase(phase);
      importState.updateProgress({
        phase,
        global: { totalRecords: 100, processedRecords: progress },
        current: { 
          groupName: `阶段${currentPhaseIndex + 1}`, 
          totalRecords: 20, 
          processedRecords: Math.min(progress % 20, 20)
        },
        currentOperation: `正在${importState.currentPhaseDescription}...`,
        isActive: true
      });

      progress += 5;
      if (progress >= (currentPhaseIndex + 1) * 20) {
        currentPhaseIndex++;
      }
    }, 200);

    return () => clearInterval(interval);
  }, [simulateProgress, importState]);

  const handleStartSimulation = () => {
    importState.resetProgress();
    setSimulateProgress(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importState.handleFileUpload(file);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-base-content mb-2">
            🔧 useImportState Hook 演示
          </h1>
          <p className="text-base-content/70">
            展示集中化状态管理的完整功能和API
          </p>
        </div>

        {/* 控制面板 */}
        <div className={cn(cardEffects.elevated, 'p-6')}>
          <h2 className="text-xl font-bold mb-4">测试控制面板</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => importState.updateSelectedMonth('2025-01')}
            >
              设置1月
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => importState.toggleDataGroup(ImportDataGroup.EARNINGS)}
            >
              切换薪资项目
            </button>
            <button 
              className="btn btn-accent btn-sm"
              onClick={importState.selectAllDataGroups}
            >
              全选数据组
            </button>
            <button 
              className="btn btn-info btn-sm"
              onClick={() => importState.updateImportMode(
                importState.config.importMode === ImportMode.UPSERT ? ImportMode.REPLACE : ImportMode.UPSERT
              )}
            >
              切换模式
            </button>
            <button 
              className="btn btn-warning btn-sm"
              onClick={handleStartSimulation}
              disabled={simulateProgress}
            >
              {simulateProgress ? '进行中...' : '模拟进度'}
            </button>
            <button 
              className="btn btn-error btn-sm"
              onClick={importState.resetAll}
            >
              重置全部
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 配置状态面板 */}
          <div className="space-y-6">
            <div className={cn(cardEffects.standard, 'p-6')}>
              <h3 className="text-lg font-bold mb-4">📋 配置状态</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">
                    <span className="label-text">选中月份</span>
                  </label>
                  <input 
                    type="month"
                    className="input input-bordered w-full input-sm"
                    value={importState.config.selectedMonth}
                    onChange={(e) => importState.updateSelectedMonth(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">导入模式</span>
                  </label>
                  <select 
                    className="select select-bordered w-full select-sm"
                    value={importState.config.importMode}
                    onChange={(e) => importState.updateImportMode(e.target.value as ImportMode)}
                  >
                    <option value={ImportMode.UPSERT}>更新插入</option>
                    <option value={ImportMode.REPLACE}>替换</option>
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">数据组选择</span>
                  </label>
                  <div className="space-y-2">
                    {Object.values(ImportDataGroup).filter(g => g !== ImportDataGroup.ALL).map((group) => (
                      <label key={group} className="cursor-pointer label p-2 bg-base-200 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{DATA_GROUP_CONSTANTS.ICONS[group]}</span>
                          <span className="label-text text-sm">{DATA_GROUP_CONSTANTS.LABELS[group]}</span>
                        </div>
                        <input 
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={importState.config.selectedDataGroups.includes(group)}
                          onChange={() => importState.toggleDataGroup(group)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 文件状态面板 */}
            <div className={cn(cardEffects.standard, 'p-6')}>
              <h3 className="text-lg font-bold mb-4">📁 文件状态</h3>
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="file-input file-input-bordered w-full file-input-sm"
                />
                
                {importState.fileState.file && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>文件名:</span>
                      <span className="font-mono">{importState.fileState.fileName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>大小:</span>
                      <span className="font-mono">{(importState.fileState.fileSize / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>状态:</span>
                      <div className="flex gap-1">
                        {importState.fileState.isUploading && <span className="badge badge-warning badge-sm">上传中</span>}
                        {importState.fileState.isParsing && <span className="badge badge-info badge-sm">解析中</span>}
                        {importState.fileState.isValidating && <span className="badge badge-secondary badge-sm">验证中</span>}
                        {!importState.isProcessing && <span className="badge badge-success badge-sm">就绪</span>}
                      </div>
                    </div>
                    <button 
                      className="btn btn-outline btn-error btn-sm w-full"
                      onClick={importState.clearFile}
                    >
                      清除文件
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 进度和验证面板 */}
          <div className="space-y-6">
            {/* 进度状态 */}
            <div className={cn(cardEffects.standard, 'p-6')}>
              <h3 className="text-lg font-bold mb-4">⚡ 进度状态</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>当前阶段:</span>
                  <span className={`badge ${importState.isProcessing ? 'badge-warning' : 'badge-success'}`}>
                    {importState.currentPhaseDescription}
                  </span>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>全局进度</span>
                    <span>{importState.progressPercentage}%</span>
                  </div>
                  <progress 
                    className="progress progress-primary w-full" 
                    value={importState.progressPercentage} 
                    max="100"
                  />
                </div>

                {importState.progress.current.groupName && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{importState.progress.current.groupName}</span>
                      <span>
                        {importState.progress.current.processedRecords}/{importState.progress.current.totalRecords}
                      </span>
                    </div>
                    <progress 
                      className="progress progress-secondary w-full" 
                      value={importState.progress.current.processedRecords} 
                      max={importState.progress.current.totalRecords}
                    />
                  </div>
                )}

                {importState.progress.currentOperation && (
                  <div className="text-sm text-base-content/70">
                    {importState.progress.currentOperation}
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    className="btn btn-outline btn-sm flex-1"
                    onClick={importState.resetProgress}
                  >
                    重置进度
                  </button>
                </div>
              </div>
            </div>

            {/* 验证状态 */}
            <div className={cn(cardEffects.standard, 'p-6')}>
              <h3 className="text-lg font-bold mb-4">✅ 验证状态</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>配置有效:</span>
                  <span className={`badge ${importState.isConfigValid ? 'badge-success' : 'badge-error'}`}>
                    {importState.isConfigValid ? '有效' : '无效'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>准备导入:</span>
                  <span className={`badge ${importState.isReadyForImport ? 'badge-success' : 'badge-warning'}`}>
                    {importState.isReadyForImport ? '就绪' : '未就绪'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>处理中:</span>
                  <span className={`badge ${importState.isProcessing ? 'badge-warning' : 'badge-success'}`}>
                    {importState.isProcessing ? '是' : '否'}
                  </span>
                </div>

                <div className="stats stats-vertical shadow-sm">
                  <div className="stat py-2">
                    <div className="stat-title text-xs">错误</div>
                    <div className={`stat-value text-lg ${importState.hasErrors ? 'text-error' : 'text-success'}`}>
                      {importState.validation.errors.length}
                    </div>
                  </div>
                  
                  <div className="stat py-2">
                    <div className="stat-title text-xs">警告</div>
                    <div className={`stat-value text-lg ${importState.hasWarnings ? 'text-warning' : 'text-success'}`}>
                      {importState.validation.warnings.length}
                    </div>
                  </div>
                </div>
                
                <button 
                  className="btn btn-primary btn-sm w-full"
                  onClick={importState.validateConfiguration}
                >
                  验证配置
                </button>
              </div>
            </div>
          </div>

          {/* 状态详情面板 */}
          <div className="space-y-6">
            {/* 状态概览 */}
            <div className={cn(cardEffects.primary, 'p-6')}>
              <h3 className="text-lg font-bold mb-4">📊 状态概览</h3>
              <div className="stats stats-vertical shadow-sm bg-base-100">
                <div className="stat">
                  <div className="stat-title">选中数据组</div>
                  <div className="stat-value text-primary">{importState.config.selectedDataGroups.length}</div>
                  <div className="stat-desc">
                    {importState.config.selectedDataGroups.length > 0 ? '已选择' : '未选择'}
                  </div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">文件状态</div>
                  <div className="stat-value text-secondary">
                    {importState.fileState.file ? '✓' : '✗'}
                  </div>
                  <div className="stat-desc">
                    {importState.fileState.file ? '已上传' : '未上传'}
                  </div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">整体状态</div>
                  <div className={`stat-value ${importState.isReadyForImport ? 'text-success' : 'text-warning'}`}>
                    {importState.isReadyForImport ? '就绪' : '待完善'}
                  </div>
                  <div className="stat-desc">
                    {importState.isReadyForImport ? '可以开始导入' : '需要完善配置'}
                  </div>
                </div>
              </div>
            </div>

            {/* 错误和警告详情 */}
            {(importState.hasErrors || importState.hasWarnings) && (
              <div className={cn(cardEffects.standard, 'p-6')}>
                <h3 className="text-lg font-bold mb-4">⚠️ 问题详情</h3>
                
                {importState.hasErrors && (
                  <div className="alert alert-error mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-bold">配置错误</h4>
                      <ul className="text-sm mt-1">
                        {importState.validation.errors.map((error, index) => (
                          <li key={index}>• {String(error)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {importState.hasWarnings && (
                  <div className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="font-bold">警告信息</h4>
                      <ul className="text-sm mt-1">
                        {importState.validation.warnings.map((warning, index) => (
                          <li key={index}>• {String(warning)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* API 调试信息 */}
            <div className={cn(cardEffects.standard, 'p-6')}>
              <h3 className="text-lg font-bold mb-4">🐛 调试信息</h3>
              <div className="mockup-code text-xs">
                <pre><code>{JSON.stringify({
                  isConfigValid: importState.isConfigValid,
                  isReadyForImport: importState.isReadyForImport,
                  isProcessing: importState.isProcessing,
                  hasErrors: importState.hasErrors,
                  hasWarnings: importState.hasWarnings,
                  currentPhase: importState.progress.phase,
                  progressPercentage: importState.progressPercentage
                }, null, 2)}</code></pre>
              </div>
            </div>
          </div>
        </div>

        {/* Hook API 文档 */}
        <div className={cn(cardEffects.accent, 'p-6')}>
          <h3 className="text-2xl font-bold mb-4">📚 Hook API 文档</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-bold mb-2">配置操作</h4>
              <ul className="text-sm space-y-1">
                <li>• updateSelectedMonth(month)</li>
                <li>• updateSelectedDataGroups(groups)</li>
                <li>• toggleDataGroup(group)</li>
                <li>• selectAllDataGroups()</li>
                <li>• updateImportMode(mode)</li>
                <li>• updateImportOptions(options)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-2">文件操作</h4>
              <ul className="text-sm space-y-1">
                <li>• handleFileUpload(file)</li>
                <li>• clearFile()</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-2">进度操作</h4>
              <ul className="text-sm space-y-1">
                <li>• updateProgress(updates)</li>
                <li>• setCurrentPhase(phase)</li>
                <li>• resetProgress()</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-2">验证操作</h4>
              <ul className="text-sm space-y-1">
                <li>• validateConfiguration()</li>
                <li>• validateFile(file)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-2">状态查询</h4>
              <ul className="text-sm space-y-1">
                <li>• isConfigValid</li>
                <li>• isReadyForImport</li>
                <li>• isProcessing</li>
                <li>• hasErrors / hasWarnings</li>
                <li>• currentPhaseDescription</li>
                <li>• progressPercentage</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-2">重置操作</h4>
              <ul className="text-sm space-y-1">
                <li>• resetAll()</li>
                <li>• resetToConfiguration()</li>
                <li>• clearResult()</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportStateDemo;