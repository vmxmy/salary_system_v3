/**
 * 简化版ImportContext演示组件
 * 使用SimpleImportContext演示核心功能
 */

import React, { useState, useCallback, useRef } from 'react';
import { SimpleImportContextProvider, useSimpleImportContext, SimpleImportPhase } from '../context/SimpleImportContext';
import type { SimpleImportPhaseType } from '../context/SimpleImportContext';
import { MonthSelector } from './config/MonthSelector';
import { DataGroupSelectorTest } from './DataGroupSelectorTest';
import { ImportDataGroup } from '@/types/payroll-import';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';
import { useAvailablePayrollMonths } from '@/hooks/payroll/useAvailablePayrollMonths';

/**
 * Context内部演示组件
 */
const SimpleImportContextDemoContent: React.FC = () => {
  const context = useSimpleImportContext();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取真实数据
  const { data: availableMonths, isLoading: isLoadingMonths } = useAvailablePayrollMonths();

  // === 事件处理 ===
  const handleMonthChange = useCallback((month: string) => {
    context.notifyConfigChange({ month });
  }, [context]);

  const handleDataGroupsChange = useCallback((dataGroups: ImportDataGroup[]) => {
    context.notifyConfigChange({ dataGroups });
  }, [context]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    context.notifyFileChange({
      hasFile: true,
      fileName: file.name,
      fileSize: file.size
    });

    // 模拟文件处理
    context.notifyProgress({
      phase: SimpleImportPhase.FILE_PROCESSING,
      progress: 0,
      message: `开始处理: ${file.name}`
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      context.notifyProgress({
        phase: SimpleImportPhase.FILE_PROCESSING,
        progress: Math.min(progress * 0.6, 60), // 最大到60%
        message: `处理文件中... ${progress}%`
      });

      if (progress >= 100) {
        clearInterval(interval);
        context.notifyProgress({
          phase: SimpleImportPhase.DATA_VALIDATION,
          progress: 70,
          message: '文件解析完成，验证数据中...'
        });

        setTimeout(() => {
          context.notifyProgress({
            phase: SimpleImportPhase.DATA_VALIDATION,
            progress: 85,
            message: '数据验证完成，准备导入'
          });
        }, 1000);
      }
    }, 200);
  }, [context]);

  const handleStartImport = useCallback(async () => {
    try {
      await context.startImport();
      
      // 模拟导入过程
      let progress = 85;
      const importInterval = setInterval(() => {
        progress += 3;
        const finalProgress = Math.min(progress, 100);
        
        context.notifyProgress({
          phase: SimpleImportPhase.DATA_IMPORT,
          progress: finalProgress,
          message: `导入数据中... ${finalProgress}%`
        });

        if (finalProgress >= 100) {
          clearInterval(importInterval);
          setTimeout(() => {
            context.completeImport();
          }, 500);
        }
      }, 300);
    } catch (error) {
      console.error('启动导入失败:', error);
    }
  }, [context]);

  const handleReset = useCallback(async () => {
    await context.resetImport();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [context]);

  // 获取阶段中文名
  const getPhaseDisplayName = (phase: SimpleImportPhaseType) => {
    const phaseNames = {
      [SimpleImportPhase.CONFIGURATION]: '配置阶段',
      [SimpleImportPhase.FILE_PROCESSING]: '文件处理',
      [SimpleImportPhase.DATA_VALIDATION]: '数据验证',
      [SimpleImportPhase.DATA_IMPORT]: '数据导入',
      [SimpleImportPhase.COMPLETED]: '完成'
    };
    return phaseNames[phase] || phase;
  };

  const diagnostics = context.getDiagnostics();

  return (
    <div className="space-y-8">
      {/* 状态面板 */}
      <div className={cn(cardEffects.primary, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">📊 Context状态总览</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">当前阶段</div>
            <div className="stat-value text-lg">{getPhaseDisplayName(context.currentState.phase)}</div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">整体进度</div>
            <div className="stat-value text-lg">{context.progress.overall}%</div>
            <div className="w-full bg-base-300 rounded-full h-2 mt-1">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${context.progress.overall}%` }}
              />
            </div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">配置状态</div>
            <div className={`stat-value text-lg ${context.currentState.canProceed ? 'text-success' : 'text-warning'}`}>
              {context.currentState.canProceed ? '✓ 完整' : '⚠ 待完成'}
            </div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">错误状态</div>
            <div className={`stat-value text-lg ${context.errors.hasAnyError ? 'text-error' : 'text-success'}`}>
              {context.errors.hasAnyError ? '❌ 有错误' : '✅ 正常'}
            </div>
          </div>
        </div>

        <div className="text-sm text-base-content/70">
          会话ID: {context.sessionId} | 运行时长: {Math.round(diagnostics.performance.duration / 1000)}秒
        </div>

        {/* 进度消息 */}
        {context.progress.isActive && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="text-sm font-medium text-primary">
              {context.progress.message}
            </div>
          </div>
        )}
      </div>

      {/* 配置区域 */}
      <div className={cn(cardEffects.secondary, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">⚙️ 导入配置</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">月份选择</h3>
            <MonthSelector
              selectedMonth={context.currentState.selectedMonth}
              onMonthChange={handleMonthChange}
              availableMonths={availableMonths || [
                { month: '2025-01', payrollCount: 150, hasData: true, hasPeriod: true }
              ]}
              loading={isLoadingMonths}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">数据组选择</h3>
            <div className="p-4 border rounded-lg bg-base-100">
              <div className="mb-3">
                <div className="text-sm">
                  当前已选择: {context.currentState.selectedDataGroups.length} 个数据组
                </div>
                <div className="text-xs text-base-content/60">
                  {context.currentState.selectedDataGroups.join(', ') || '无'}
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { key: ImportDataGroup.EARNINGS, label: '薪资明细' },
                  { key: ImportDataGroup.CONTRIBUTION_BASES, label: '缴费基数' },
                  { key: ImportDataGroup.CATEGORY_ASSIGNMENT, label: '人员类别' },
                  { key: ImportDataGroup.JOB_ASSIGNMENT, label: '部门职位' }
                ].map(group => (
                  <label key={group.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={context.currentState.selectedDataGroups.includes(group.key)}
                      onChange={(e) => {
                        const currentGroups = context.currentState.selectedDataGroups;
                        const newGroups = e.target.checked
                          ? [...currentGroups, group.key]
                          : currentGroups.filter(g => g !== group.key);
                        handleDataGroupsChange(newGroups);
                      }}
                    />
                    <span className="text-sm">{group.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 文件上传 */}
      <div className={cn(cardEffects.elevated, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">📁 文件上传</h2>
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="file-input file-input-bordered"
          />
          {context.currentState.hasFile && (
            <div className="text-sm text-success">
              ✓ 文件已选择
            </div>
          )}
        </div>
      </div>

      {/* 控制面板 */}
      <div className={cn(cardEffects.accent, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">🎛️ 操作控制</h2>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            className={`btn btn-primary ${!context.currentState.canProceed ? 'btn-disabled' : ''}`}
            onClick={handleStartImport}
            disabled={!context.currentState.canProceed || context.progress.isActive}
          >
            {context.progress.isActive ? '导入中...' : '开始导入'}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={context.toggleImport}
            disabled={!context.currentState.hasFile}
          >
            {context.currentState.isProcessing ? '暂停' : '恢复'}
          </button>
          
          <button
            className="btn btn-outline"
            onClick={handleReset}
          >
            重置导入
          </button>
          
          <button
            className="btn btn-info btn-outline"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            {showDiagnostics ? '隐藏' : '显示'}诊断
          </button>
        </div>
      </div>

      {/* 诊断信息 */}
      {showDiagnostics && (
        <div className={cn(cardEffects.primary, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">🔍 诊断信息</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">事件时间线</h3>
              <div className="bg-base-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {diagnostics.timeLine.slice(-8).map((event, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-mono text-xs text-base-content/50">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                      <div>{event.event}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">状态快照</h3>
              <div className="bg-base-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs">
                  {JSON.stringify(context.currentState, null, 2)}
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
 * 主演示组件
 */
export const SimpleImportContextDemo: React.FC = () => {
  return (
    <SimpleImportContextProvider
      debug={true}
      initialConfig={{
        month: '2025-01',
        dataGroups: [ImportDataGroup.EARNINGS]
      }}
      onStateChange={(state) => console.log('[Context] 状态变更:', state)}
      onProgressChange={(progress) => console.log('[Context] 进度更新:', progress)}
      onError={(error) => console.error('[Context] 错误:', error)}
      onComplete={(result) => console.log('[Context] 完成:', result)}
    >
      <div className="min-h-screen bg-base-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-base-content mb-4">
              🎛️ Context集成演示
            </h1>
            <p className="text-lg text-base-content/70">
              简化版ImportContext功能演示 - 组件间状态同步与生命周期管理
            </p>
          </div>
          
          <SimpleImportContextDemoContent />
        </div>
      </div>
    </SimpleImportContextProvider>
  );
};

export default SimpleImportContextDemo;