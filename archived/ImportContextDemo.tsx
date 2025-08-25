/**
 * ImportContext 集成演示组件
 * 
 * 展示ImportContext如何统一管理和协调所有导入相关组件：
 * - MonthSelector 和 DataGroupSelector 的状态同步
 * - useImportState 和 useFileProcessor 的协同工作
 * - 统一的进度显示和错误处理
 * - 生命周期管理和调试信息
 */

import React, { useState, useCallback, useRef } from 'react';
import { ImportContextProvider, useImportContext } from '../context/ImportContext';
import { MonthSelector } from './config/MonthSelector';
import { DataGroupSelector } from './config/DataGroupSelector';
import { ImportDataGroup, ImportPhase } from '@/types/payroll-import';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';
import { useAvailablePayrollMonths } from '@/hooks/payroll/useAvailablePayrollMonths';

/**
 * Context内部的演示内容组件
 */
const ImportContextDemoContent: React.FC = () => {
  const context = useImportContext();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取真实的可用月份数据
  const { data: availableMonths, isLoading: isLoadingMonths, error: monthsError } = useAvailablePayrollMonths();

  // === 配置区域事件处理 ===
  const handleMonthChange = useCallback((month: string) => {
    context.notifyConfigChange({ month });
  }, [context]);

  const handleDataGroupToggle = useCallback((group: ImportDataGroup) => {
    const currentGroups = context.currentState.selectedDataGroups;
    const newGroups = currentGroups.includes(group)
      ? currentGroups.filter(g => g !== group)
      : [...currentGroups, group];
    
    context.notifyConfigChange({ dataGroups: newGroups });
  }, [context]);

  const handleSelectAllGroups = useCallback(() => {
    const allGroups = Object.values(ImportDataGroup);
    const currentGroups = context.currentState.selectedDataGroups;
    const newGroups = currentGroups.length === allGroups.length ? [] : allGroups;
    
    context.notifyConfigChange({ dataGroups: newGroups });
  }, [context]);

  // === 文件处理事件 ===
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    context.notifyFileChange({
      hasFile: true,
      fileName: file.name,
      fileSize: file.size
    });

    // 模拟文件处理过程
    context.notifyProgress({
      phase: ImportPhase.FILE_PROCESSING,
      progress: 0,
      message: `开始处理文件: ${file.name}`
    });

    // 模拟处理进度
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      context.notifyProgress({
        phase: ImportPhase.FILE_PROCESSING,
        progress,
        message: `处理中... ${progress}%`
      });

      if (progress >= 100) {
        clearInterval(progressInterval);
        context.notifyProgress({
          phase: ImportPhase.DATA_VALIDATION,
          progress: 0,
          message: '文件处理完成，开始验证数据'
        });

        // 模拟数据验证完成
        setTimeout(() => {
          context.notifyFileChange({
            hasFile: true,
            fileName: file.name,
            fileSize: file.size,
            parseResult: {
              originalFileName: file.name,
              fileSize: file.size,
              parseDate: new Date(),
              worksheetSummary: {
                totalSheets: 3,
                validSheets: 3,
                invalidSheets: 0,
                recognizedSheets: [
                  { sheetName: '薪资明细', dataType: 'earnings', rowCount: 150 },
                  { sheetName: '社保信息', dataType: 'insurance', rowCount: 150 },
                  { sheetName: '员工信息', dataType: 'employee', rowCount: 150 }
                ]
              },
              processingStats: {
                totalProcessingTime: 2500,
                averageRowProcessingTime: 16.67,
                memoryUsage: 24.5
              }
            }
          });
        }, 1500);
      }
    }, 200);
  }, [context]);

  const handleClearFile = useCallback(() => {
    context.notifyFileChange({
      hasFile: false
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    context.clearErrors('file');
  }, [context]);

  // === 流程控制 ===
  const handleStartImport = useCallback(async () => {
    try {
      await context.startImport();
      
      // 模拟导入进度
      let progress = 0;
      const importInterval = setInterval(() => {
        progress += 5;
        context.notifyProgress({
          phase: ImportPhase.DATA_IMPORT,
          progress,
          message: `导入进度: ${progress}%`
        });

        if (progress >= 100) {
          clearInterval(importInterval);
          context.completeImport();
        }
      }, 300);
    } catch (error) {
      console.error('启动导入失败:', error);
    }
  }, [context]);

  const handleResetImport = useCallback(async () => {
    try {
      await context.resetImport();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('重置导入失败:', error);
    }
  }, [context]);

  const handleToggleImport = useCallback(() => {
    context.toggleImport();
  }, [context]);

  // === 诊断信息获取 ===
  const diagnostics = context.getDiagnostics();

  return (
    <div className="space-y-8">
      {/* 状态总览面板 */}
      <div className={cn(cardEffects.primary, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">📊 ImportContext 状态总览</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">当前阶段</div>
            <div className="stat-value text-lg">{context.currentState.phase}</div>
            <div className="stat-desc">{context.progress.message}</div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">整体进度</div>
            <div className="stat-value text-lg">{context.progress.overall}%</div>
            <div className="stat-desc">
              <div className="w-full bg-base-300 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${context.progress.overall}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">配置状态</div>
            <div className={`stat-value text-lg ${context.currentState.canProceed ? 'text-success' : 'text-warning'}`}>
              {context.currentState.canProceed ? '完整' : '待完成'}
            </div>
            <div className="stat-desc">
              月份: {context.currentState.selectedMonth || '未选择'} | 
              数据组: {context.currentState.selectedDataGroups.length}个
            </div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">错误状态</div>
            <div className={`stat-value text-lg ${context.errors.hasAnyError ? 'text-error' : 'text-success'}`}>
              {context.errors.hasAnyError ? '有错误' : '正常'}
            </div>
            <div className="stat-desc">
              {context.errors.configErrors.length + context.errors.fileErrors.length + context.errors.processErrors.length} 个错误
            </div>
          </div>
        </div>

        {/* 错误显示 */}
        {context.errors.hasAnyError && (
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">发现错误</h3>
              <ul className="list-disc list-inside">
                {context.errors.configErrors.map((error, index) => (
                  <li key={`config-${index}`}>配置错误: {error}</li>
                ))}
                {context.errors.fileErrors.map((error, index) => (
                  <li key={`file-${index}`}>文件错误: {error}</li>
                ))}
                {context.errors.processErrors.map((error, index) => (
                  <li key={`process-${index}`}>处理错误: {error}</li>
                ))}
              </ul>
            </div>
            <button 
              className="btn btn-sm btn-outline" 
              onClick={() => context.clearErrors()}
            >
              清除所有错误
            </button>
          </div>
        )}

        {/* 进度条 */}
        {context.progress.isActive && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{context.progress.message}</span>
              <span className="text-sm">{context.progress.overall}%</span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${context.progress.overall}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 配置区域 */}
      <div className={cn(cardEffects.elevated, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">⚙️ 导入配置区域</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 月份选择器 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">选择导入月份</h3>
            {isLoadingMonths ? (
              <div className="flex items-center justify-center p-8">
                <span className="loading loading-spinner loading-lg"></span>
                <span className="ml-3">加载可用月份数据...</span>
              </div>
            ) : (
              <MonthSelector
                selectedMonth={context.currentState.selectedMonth}
                onMonthChange={handleMonthChange}
                availableMonths={availableMonths || [
                  { month: '2025-01', payrollCount: 150, hasData: true, hasPeriod: true },
                  { month: '2025-02', payrollCount: 145, hasData: true, hasPeriod: false }
                ]}
                loading={isLoadingMonths}
                error={monthsError ? '加载月份数据失败' : null}
              />
            )}
          </div>
          
          {/* 数据组选择器 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">选择导入数据组</h3>
            <DataGroupSelector
              selectedDataGroups={context.currentState.selectedDataGroups}
              onGroupToggle={handleDataGroupToggle}
              onSelectAllGroups={handleSelectAllGroups}
            />
          </div>
        </div>
      </div>

      {/* 文件处理区域 */}
      <div className={cn(cardEffects.secondary, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">📁 文件处理区域</h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="file-input file-input-bordered w-full max-w-xs"
            />
            
            {context.currentState.hasFile && (
              <button 
                className="btn btn-outline btn-error"
                onClick={handleClearFile}
              >
                清除文件
              </button>
            )}
          </div>
          
          <div className="text-sm text-base-content/70">
            文件状态: {context.currentState.hasFile ? '已选择文件' : '未选择文件'} | 
            处理状态: {context.progress.isActive ? '处理中...' : '空闲'}
          </div>
        </div>
      </div>

      {/* 控制面板 */}
      <div className={cn(cardEffects.accent, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">🎛️ 导入控制面板</h2>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            className={`btn btn-primary ${!context.currentState.canProceed ? 'btn-disabled' : ''}`}
            onClick={handleStartImport}
            disabled={!context.currentState.canProceed || context.progress.isActive}
          >
            {context.progress.isActive ? '导入中...' : '开始导入'}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={handleToggleImport}
            disabled={!context.currentState.hasFile}
          >
            {context.importState.progress.isProcessing ? '暂停' : '恢复'}
          </button>
          
          <button
            className="btn btn-outline"
            onClick={handleResetImport}
          >
            重置导入
          </button>
          
          <button
            className="btn btn-info btn-outline"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            {showDiagnostics ? '隐藏' : '显示'} 诊断信息
          </button>
        </div>

        <div className="text-sm text-base-content/70">
          会话ID: {context.sessionId} | 
          运行时长: {Math.round(diagnostics.performance.duration / 1000)}秒 | 
          事件数量: {diagnostics.timeLine.length}个
        </div>
      </div>

      {/* 诊断信息面板 */}
      {showDiagnostics && (
        <div className={cn(cardEffects.primary, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">🔍 系统诊断信息</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 事件时间线 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">事件时间线 (最近10条)</h3>
              <div className="bg-base-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {diagnostics.timeLine.slice(-10).map((event, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-mono text-xs text-base-content/50">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="font-medium">{event.event}</div>
                      {event.data && (
                        <div className="text-xs text-base-content/70 font-mono">
                          {JSON.stringify(event.data, null, 2).slice(0, 100)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 状态快照 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">当前状态快照</h3>
              <div className="bg-base-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs font-mono">
                  {JSON.stringify({
                    currentState: context.currentState,
                    progress: context.progress,
                    errors: context.errors
                  }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 主演示组件 - 包含Context Provider
 */
export const ImportContextDemo: React.FC = () => {
  return (
    <ImportContextProvider
      debug={true}
      initialConfig={{
        month: '2025-01',
        dataGroups: [ImportDataGroup.EARNINGS]
      }}
      onStateChange={(state) => console.log('[ImportContextDemo] State changed:', state)}
      onProgressChange={(progress) => console.log('[ImportContextDemo] Progress changed:', progress)}
      onError={(error) => console.error('[ImportContextDemo] Error:', error)}
      onComplete={(result) => console.log('[ImportContextDemo] Import completed:', result)}
    >
      <div className="min-h-screen bg-base-100 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* 页面标题 */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-base-content mb-4">
              🎛️ ImportContext 集成演示
            </h1>
            <p className="text-lg text-base-content/70 mb-2">
              完整的组件间通信和状态同步演示
            </p>
            <p className="text-base-content/60">
              Context驱动 | 实时状态同步 | 统一错误处理 | 生命周期管理
            </p>
          </div>

          <ImportContextDemoContent />

          {/* 使用说明 */}
          <div className="alert alert-info">
            <span className="text-sm">
              💡 <strong>使用说明:</strong> 这个演示展示了ImportContext如何统一管理所有导入相关组件的状态。
              尝试更改配置、上传文件、开始导入来查看各组件间的状态同步效果。
              开启诊断信息可以查看详细的内部状态和事件时间线。
            </span>
          </div>
        </div>
      </div>
    </ImportContextProvider>
  );
};

export default ImportContextDemo;