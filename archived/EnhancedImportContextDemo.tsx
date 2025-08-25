/**
 * EnhancedImportContextDemo组件
 * 演示集成真实导入功能的增强版Context
 */

import React, { useState, useCallback, useRef } from 'react';
import { EnhancedImportContextProvider, useEnhancedImportContext, EnhancedImportPhase } from '../context/EnhancedImportContext';
import type { EnhancedImportPhaseType } from '../context/EnhancedImportContext';
import { MonthSelector } from './config/MonthSelector';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ImportMode, SalaryComponentCategory } from '@/hooks/payroll/import-export/types';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';
import { useAvailablePayrollMonths } from '@/hooks/payroll/useAvailablePayrollMonths';
import { EmployeeCountDebugger } from './debug/EmployeeCountDebugger';
import { ErrorHandlingDisplay, type ErrorInfo, useErrorHandling } from './common/ErrorHandlingDisplay';
import { ProgressDisplay, type ProgressData } from './common/ProgressDisplay';
import { ImportWizard, WizardStep, type WizardConfig } from './wizard/ImportWizard';
import { ImportProgressModal } from './modals/ImportProgressModal';

/**
 * Context内部演示组件
 */
const EnhancedImportContextDemoContent: React.FC = () => {
  const context = useEnhancedImportContext();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showImportHistory, setShowImportHistory] = useState(false);
  const [uiMode, setUiMode] = useState<'standard' | 'wizard' | 'enhanced'>('standard');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 错误处理Hook
  const { errors, addError, removeError, clearAllErrors } = useErrorHandling();
  
  // 进度模态框状态
  const [showProgressModal, setShowProgressModal] = useState(false);

  // 获取真实数据
  const { data: availableMonths, isLoading: isLoadingMonths } = useAvailablePayrollMonths();

  // === 事件处理 ===
  const handleMonthChange = useCallback((month: string) => {
    context.notifyConfigChange({ month });
  }, [context]);

  const handleDataGroupsChange = useCallback((dataGroups: ImportDataGroup[]) => {
    context.notifyConfigChange({ dataGroups });
  }, [context]);

  const handleImportModeChange = useCallback((mode: ImportMode) => {
    context.notifyConfigChange({ importMode: mode });
  }, [context]);

  const handleCategoriesChange = useCallback((categories: SalaryComponentCategory[]) => {
    context.notifyConfigChange({ categories });
  }, [context]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('🔍 开始处理文件:', file.name);
      await context.processFile(file);
      console.log('✅ 文件处理完成');
    } catch (error) {
      console.error('❌ 文件处理失败:', error);
    }
  }, [context]);

  const handleRealImport = useCallback(async () => {
    try {
      console.log('🚀 开始真实导入...');
      
      // 显示进度模态框
      setShowProgressModal(true);
      clearAllErrors();
      
      const result = await context.performRealImport(availableMonths);
      console.log('✅导入完成:', result);
      
      // 导入完成后稍等片刻再处理结果，让用户看到完成状态
      setTimeout(() => {
        if (result.success) {
          addError({
            type: 'import',
            severity: 'low',
            message: `🎉 导入成功！处理了 ${result.successCount}/${result.totalRows} 条记录`
          });
        } else {
          result.errors.forEach(error => {
            addError({
              type: 'import',
              severity: 'critical',
              message: `导入错误: ${error.message}`
            });
          });
        }
        
        // 2秒后自动关闭模态框（如果成功）
        if (result.success) {
          setTimeout(() => {
            setShowProgressModal(false);
          }, 2000);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ 导入失败:', error);
      addError({
        type: 'import',
        severity: 'critical',
        message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  }, [context, availableMonths, addError, clearAllErrors]);

  const handleReset = useCallback(async () => {
    await context.resetImport();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [context]);

  // 获取阶段中文名
  const getPhaseDisplayName = (phase: EnhancedImportPhaseType) => {
    const phaseNames = {
      [EnhancedImportPhase.CONFIGURATION]: '配置阶段',
      [EnhancedImportPhase.FILE_PROCESSING]: '文件处理',
      [EnhancedImportPhase.DATA_VALIDATION]: '数据验证',
      [EnhancedImportPhase.REAL_IMPORT]: '真实导入',
      [EnhancedImportPhase.COMPLETED]: '完成',
      [EnhancedImportPhase.ERROR]: '错误'
    };
    return phaseNames[phase] || phase;
  };

  const diagnostics = context.getDiagnostics();

  // 转换Context进度为模态框进度格式
  const modalProgress: ProgressData | undefined = context.progress.isActive ? {
    overall: context.progress.overall,
    phase: context.currentState.phase,
    message: context.progress.message,
    isActive: context.progress.isActive,
    fileProgress: context.progress.fileProgress,
    importProgress: context.progress.importProgress,
    currentOperation: context.progress.currentOperation,
    estimatedTimeLeft: undefined,
    startTime: Date.now() - (context.progress.overall / 100) * 60000 // 粗略估算开始时间
  } : undefined;

  return (
    <div className="space-y-8">
      {/* 进度模态框 */}
      <ImportProgressModal
        isOpen={showProgressModal}
        progress={modalProgress || null}
        errors={errors}
        title="薪资数据导入进度"
        allowCancel={context.progress.isActive}
        onCancel={() => {
          // TODO: 实现取消导入逻辑
          setShowProgressModal(false);
        }}
        onClose={() => setShowProgressModal(false)}
        onErrorDismiss={(errorId) => removeError(errorId)}
        onErrorClearAll={clearAllErrors}
      />

      {/* 状态面板 */}
      <div className={cn(cardEffects.primary, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">📊 增强版Context状态总览</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
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
              {context.currentState.canProceed ? '✓ 就绪' : '⚠ 待完成'}
            </div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">文件状态</div>
            <div className={`stat-value text-lg ${context.currentState.hasParseResult ? 'text-success' : 'text-warning'}`}>
              {context.currentState.hasParseResult ? '✓ 已解析' : '⏳ 待处理'}
            </div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">错误状态</div>
            <div className={`stat-value text-lg ${context.errors.hasAnyError ? 'text-error' : 'text-success'}`}>
              {context.errors.hasAnyError ? '❌ 有错误' : '✅ 正常'}
            </div>
          </div>
        </div>

        {/* 文件信息 */}
        {context.currentState.hasFile && (
          <div className="mb-4 p-3 bg-info/5 rounded-lg border border-info/20">
            <div className="text-sm">
              <strong>文件:</strong> {context.currentState.fileName} 
              ({Math.round((context.currentState.fileSize || 0) / 1024)}KB)
            </div>
          </div>
        )}

        {/* 数据统计 */}
        {context.data.parseResult && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stat bg-success/10 border border-success/20 rounded-lg p-3">
              <div className="stat-title text-xs">工作表</div>
              <div className="stat-value text-sm">{context.data.statistics.totalSheets}</div>
            </div>
            <div className="stat bg-success/10 border border-success/20 rounded-lg p-3">
              <div className="stat-title text-xs">总记录</div>
              <div className="stat-value text-sm">{context.data.statistics.totalRows}</div>
            </div>
            <div className="stat bg-success/10 border border-success/20 rounded-lg p-3">
              <div className="stat-title text-xs">有效记录</div>
              <div className="stat-value text-sm">{context.data.statistics.validRows}</div>
            </div>
            <div className="stat bg-success/10 border border-success/20 rounded-lg p-3">
              <div className="stat-title text-xs">员工数</div>
              <div className="stat-value text-sm">{context.data.statistics.uniqueEmployees}</div>
            </div>
          </div>
        )}

        <div className="text-sm text-base-content/70">
          会话ID: {context.sessionId} | 运行时长: {Math.round(diagnostics.performance.duration / 1000)}秒
        </div>

        {/* 进度消息 */}
        {context.progress.isActive && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="text-sm font-medium text-primary">
              {context.progress.message}
              {context.progress.currentOperation && (
                <span className="ml-2 text-xs">({context.progress.currentOperation})</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
              <div>
                文件处理: {context.progress.fileProgress}%
                <div className="w-full bg-base-300 rounded-full h-1">
                  <div 
                    className="bg-info h-1 rounded-full transition-all duration-300"
                    style={{ width: `${context.progress.fileProgress}%` }}
                  />
                </div>
              </div>
              <div>
                数据导入: {context.progress.importProgress}%
                <div className="w-full bg-base-300 rounded-full h-1">
                  <div 
                    className="bg-success h-1 rounded-full transition-all duration-300"
                    style={{ width: `${context.progress.importProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 配置区域 */}
      <div className={cn(cardEffects.secondary, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">⚙️ 导入配置</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">基础配置</h3>
            
            <div className="space-y-4">
              {/* 月份选择 */}
              <div>
                <label className="block text-sm font-medium mb-2">薪资周期</label>
                <MonthSelector
                  selectedMonth={context.currentState.selectedMonth}
                  onMonthChange={handleMonthChange}
                  availableMonths={availableMonths || [
                    { month: '2025-01', payrollCount: 150, hasData: true, hasPeriod: true }
                  ]}
                  loading={isLoadingMonths}
                />
              </div>

              {/* 导入模式 */}
              <div>
                <label className="block text-sm font-medium mb-2">导入模式</label>
                <select
                  className="select select-bordered w-full"
                  value={context.currentState.importMode}
                  onChange={(e) => handleImportModeChange(e.target.value as ImportMode)}
                >
                  <option value="upsert">UPSERT (更新或插入)</option>
                  <option value="replace">REPLACE (完全替换)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">数据选择</h3>
            
            <div className="space-y-4">
              {/* 数据组选择 */}
              <div>
                <label className="block text-sm font-medium mb-2">数据组类型</label>
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

              {/* 薪资组件类别 */}
              <div>
                <label className="block text-sm font-medium mb-2">薪资组件类别</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'basic_salary', label: '基本薪资' },
                    { key: 'benefits', label: '福利补贴' },
                    { key: 'personal_tax', label: '个人所得税' },
                    { key: 'other_deductions', label: '其他扣除' }
                  ].map(category => (
                    <label key={category.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={context.currentState.selectedCategories.includes(category.key as SalaryComponentCategory)}
                        onChange={(e) => {
                          const currentCategories = context.currentState.selectedCategories;
                          const newCategories = e.target.checked
                            ? [...currentCategories, category.key as SalaryComponentCategory]
                            : currentCategories.filter(c => c !== category.key);
                          handleCategoriesChange(newCategories);
                        }}
                      />
                      <span className="text-xs">{category.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 文件处理 */}
      <div className={cn(cardEffects.accent, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">📁 文件处理</h2>
        <div className="flex items-center gap-4 mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="file-input file-input-bordered"
            disabled={context.progress.isActive}
          />
          <button
            className="btn btn-outline"
            onClick={context.clearFileResults}
            disabled={context.progress.isActive || !context.currentState.hasFile}
          >
            清除文件
          </button>
        </div>

        {/* 数据类型检测结果 */}
        {context.data.statistics.dataTypes.length > 0 && (
          <div className="bg-success/10 p-4 rounded-lg border border-success/20">
            <h3 className="font-semibold text-success mb-2">✅ 检测到的数据类型</h3>
            <div className="flex flex-wrap gap-2">
              {context.data.statistics.dataTypes.map(dataType => (
                <span key={dataType} className="badge badge-success badge-sm">
                  {dataType === ImportDataGroup.EARNINGS ? '薪资明细' :
                   dataType === ImportDataGroup.CONTRIBUTION_BASES ? '缴费基数' :
                   dataType === ImportDataGroup.CATEGORY_ASSIGNMENT ? '人员类别' :
                   dataType === ImportDataGroup.JOB_ASSIGNMENT ? '部门职位' :
                   dataType}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 导入操作 */}
      <div className={cn(cardEffects.elevated, 'p-6')}>
        <h2 className="text-2xl font-bold mb-4">🚀 数据导入</h2>
        
        {/* 导入结果 */}
        {context.data.importResult && (
          <div className={`alert ${context.data.importResult.success ? 'alert-success' : 'alert-error'} mb-4`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={
                context.data.importResult.success 
                  ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              } />
            </svg>
            <div>
              <h3 className="font-bold">
                {context.data.importResult.success ? '✅ 导入成功' : '❌ 导入失败'}
              </h3>
              <div className="text-sm">
                {context.data.importResult.success 
                  ? `成功处理 ${context.data.importResult.successCount}/${context.data.importResult.totalRows} 条记录，用时 ${Math.round(context.data.importResult.duration / 1000)}秒`
                  : `错误数量: ${context.data.importResult.errors.length}`
                }
              </div>
              
              {/* 显示错误详情 */}
              {context.data.importResult.errors.length > 0 && (
                <div className="mt-2">
                  <details className="text-sm">
                    <summary className="cursor-pointer">查看错误详情</summary>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {context.data.importResult.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-xs p-1 border-l-2 border-error/20 pl-2 mb-1">
                          行{error.row}: {error.message}
                        </div>
                      ))}
                      {context.data.importResult.errors.length > 10 && (
                        <div className="text-xs text-base-content/50">
                          ...还有 {context.data.importResult.errors.length - 10} 个错误
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap gap-4">
          <button
            className={`btn btn-primary ${!context.currentState.canProceed ? 'btn-disabled' : ''}`}
            onClick={handleRealImport}
            disabled={!context.currentState.canProceed || context.progress.isActive}
          >
            {context.currentState.isRealImporting ? '导入中...' : '🚀 开始模态框导入'}
          </button>
          
          <button
            className="btn btn-outline"
            onClick={handleReset}
            disabled={context.progress.isActive}
          >
            重置所有
          </button>
          
          <button
            className="btn btn-info btn-outline"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            {showDiagnostics ? '隐藏' : '显示'}诊断
          </button>

          <button
            className="btn btn-secondary btn-outline"
            onClick={() => setShowImportHistory(!showImportHistory)}
            disabled={context.data.importHistory.length === 0}
          >
            导入历史 ({context.data.importHistory.length})
          </button>

          <button
            className="btn btn-accent btn-outline"
            onClick={() => setShowProgressModal(true)}
            disabled={!context.progress.isActive}
          >
            📊 显示进度模态框
          </button>
        </div>

        {/* UI模式切换 */}
        <div className="mt-4 p-4 bg-base-200/50 rounded-lg">
          <div className="flex items-center gap-4 mb-2">
            <span className="font-semibold text-sm">用户界面模式:</span>
            <div className="flex gap-2">
              <button
                className={`btn btn-xs ${uiMode === 'standard' ? 'btn-active' : 'btn-outline'}`}
                onClick={() => setUiMode('standard')}
              >
                标准模式
              </button>
              <button
                className={`btn btn-xs ${uiMode === 'wizard' ? 'btn-active' : 'btn-outline'}`}
                onClick={() => setUiMode('wizard')}
              >
                向导模式
              </button>
              <button
                className={`btn btn-xs ${uiMode === 'enhanced' ? 'btn-active' : 'btn-outline'}`}
                onClick={() => setUiMode('enhanced')}
              >
                增强模式
              </button>
            </div>
          </div>
          <div className="text-xs text-base-content/60">
            体验不同的用户界面设计和交互方式
          </div>
        </div>
      </div>

      {/* 导入历史 */}
      {showImportHistory && context.data.importHistory.length > 0 && (
        <div className={cn(cardEffects.primary, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">📋 导入历史</h2>
          
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>周期ID</th>
                  <th>模式</th>
                  <th>结果</th>
                  <th>记录数</th>
                  <th>用时</th>
                </tr>
              </thead>
              <tbody>
                {context.data.importHistory.slice(0, 10).map((history, index) => (
                  <tr key={index}>
                    <td className="text-sm">
                      {new Date(history.timestamp).toLocaleString()}
                    </td>
                    <td className="text-sm font-mono">
                      {history.config.periodId}
                    </td>
                    <td>
                      <span className="badge badge-sm">
                        {history.config.mode}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-sm ${
                        history.result.success ? 'badge-success' : 'badge-error'
                      }`}>
                        {history.result.success ? '成功' : '失败'}
                      </span>
                    </td>
                    <td className="text-sm">
                      {history.result.successCount}/{history.result.totalRows}
                    </td>
                    <td className="text-sm">
                      {Math.round(history.result.duration / 1000)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 条件渲染不同的UI模式 */}
      {uiMode === 'wizard' && (
        <div className={cn(cardEffects.accent, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">🧙‍♂️ 导入向导模式</h2>
          <ImportWizard
            availableMonths={availableMonths}
            isLoadingMonths={isLoadingMonths}
            progress={modalProgress}
            onConfigChange={(config) => {
              if (config.selectedMonth) handleMonthChange(config.selectedMonth);
              if (config.selectedDataGroups) handleDataGroupsChange(config.selectedDataGroups);
              if (config.importMode) handleImportModeChange(config.importMode);
              if (config.selectedCategories) handleCategoriesChange(config.selectedCategories);
            }}
            onFileUpload={async (file) => {
              await context.processFile(file);
            }}
            onStartImport={handleRealImport}
            onReset={handleReset}
          />
        </div>
      )}

      {uiMode === 'enhanced' && (
        <div className="space-y-6">
          {/* 增强进度展示 */}
          <div className={cn(cardEffects.primary, 'p-6')}>
            <h2 className="text-2xl font-bold mb-4">✨ 增强进度体验</h2>
            {context.progress.isActive ? (
              <div className="space-y-4">
                <ProgressDisplay
                  progress={{
                    overall: context.progress.overall,
                    phase: context.currentState.phase,
                    message: context.progress.message,
                    isActive: context.progress.isActive,
                    fileProgress: context.progress.fileProgress,
                    importProgress: context.progress.importProgress,
                    currentOperation: context.progress.currentOperation
                  }}
                  style="circular"
                  showTimeEstimate={true}
                  variant="primary"
                  size="lg"
                />
                <ProgressDisplay
                  progress={{
                    overall: context.progress.overall,
                    phase: context.currentState.phase,
                    message: context.progress.message,
                    isActive: context.progress.isActive,
                    fileProgress: context.progress.fileProgress,
                    importProgress: context.progress.importProgress,
                    currentOperation: context.progress.currentOperation
                  }}
                  style="detailed"
                  showTimeEstimate={true}
                  variant="secondary"
                />
              </div>
            ) : (
              <div className="text-center text-base-content/60 py-8">
                开始导入以查看增强进度体验
              </div>
            )}
          </div>

          {/* 增强错误处理展示 */}
          {errors.length > 0 && (
            <div className={cn(cardEffects.secondary, 'p-6')}>
              <h2 className="text-2xl font-bold mb-4">🚨 增强错误处理体验</h2>
              <ErrorHandlingDisplay
                errors={errors}
                onDismiss={removeError}
                onClearAll={clearAllErrors}
              />
            </div>
          )}
        </div>
      )}

      {/* 诊断信息 */}
      {showDiagnostics && (
        <div className="space-y-6">
          <div className={cn(cardEffects.secondary, 'p-6')}>
            <h2 className="text-2xl font-bold mb-4">🔍 诊断信息</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Hook状态</h3>
                <div className="bg-base-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs">
                    {JSON.stringify(diagnostics.hookState, null, 2)}
                  </pre>
                </div>
              </div>
              
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
            </div>
          </div>

          {/* 员工统计调试 */}
          {context.data.parseResult && (
            <EmployeeCountDebugger parseResult={context.data.parseResult} />
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 主演示组件
 */
export const EnhancedImportContextDemo: React.FC = () => {
  return (
    <EnhancedImportContextProvider
      debug={true}
      initialConfig={{
        month: '2025-01',
        dataGroups: [ImportDataGroup.EARNINGS],
        importMode: 'upsert',
        categories: ['basic_salary', 'benefits', 'personal_tax', 'other_deductions']
      }}
      onStateChange={(state) => console.log('[Enhanced Context] 状态变更:', state)}
      onProgressChange={(progress) => console.log('[Enhanced Context] 进度更新:', progress)}
      onError={(error) => console.error('[Enhanced Context] 错误:', error)}
      onComplete={(result) => console.log('[Enhanced Context] 完成:', result)}
    >
      <div className="min-h-screen bg-base-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-base-content mb-4">
              🎛️ 增强版Context集成演示
            </h1>
            <p className="text-lg text-base-content/70 mb-2">
              集成真实导入功能的Context - Excel处理 + Supabase数据导入
            </p>
            <div className="flex justify-center gap-4 text-sm">
              <span className="badge badge-success">真实文件处理</span>
              <span className="badge badge-primary">Supabase集成</span>
              <span className="badge badge-info">完整进度跟踪</span>
              <span className="badge badge-accent">导入历史</span>
            </div>
          </div>
          
          <EnhancedImportContextDemoContent />
        </div>
      </div>
    </EnhancedImportContextProvider>
  );
};

export default EnhancedImportContextDemo;