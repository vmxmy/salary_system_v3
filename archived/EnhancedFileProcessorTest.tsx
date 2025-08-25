/**
 * EnhancedFileProcessorTest组件
 * 测试增强版useFileProcessor Hook的真实导入功能
 */

import React, { useState, useRef, useCallback } from 'react';
import { useEnhancedFileProcessor } from '../hooks/useEnhancedFileProcessor';
import type { RealImportConfig, RealImportResult } from '../hooks/useEnhancedFileProcessor';
import type { ImportProgress, ImportMode, SalaryComponentCategory } from '@/hooks/payroll/import-export/types';
import { ImportDataGroup } from '@/types/payroll-import';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';
import { useAvailablePayrollMonths } from '@/hooks/payroll/useAvailablePayrollMonths';

/**
 * EnhancedFileProcessorTest组件
 */
export const EnhancedFileProcessorTest: React.FC = () => {
  const fileProcessorHook = useEnhancedFileProcessor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 导入配置状态
  const [importConfig, setImportConfig] = useState<RealImportConfig>({
    periodId: '',
    mode: 'upsert' as ImportMode,
    includeCategories: ['basic_salary', 'benefits', 'personal_tax', 'other_deductions'] as SalaryComponentCategory[],
    enableValidation: true,
    batchSize: 100
  });
  
  // 进度状态
  const [currentProgress, setCurrentProgress] = useState<ImportProgress | null>(null);
  const [processingPhase, setProcessingPhase] = useState<string>('');
  
  // 获取真实薪资周期数据
  const { data: availableMonths, isLoading: isLoadingMonths } = useAvailablePayrollMonths();
  
  // 文件处理进度回调
  const handleFileProgress = useCallback((phase: string, progress: number) => {
    setProcessingPhase(`文件处理: ${phase} - ${progress}%`);
  }, []);
  
  // 导入进度回调
  const handleImportProgress = useCallback((progress: ImportProgress) => {
    setCurrentProgress(progress);
    setProcessingPhase(`导入进度: ${progress.message || '处理中...'}`);
  }, []);
  
  // 处理文件选择
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      console.log('🔍 开始处理文件:', file.name);
      await fileProcessorHook.processFile(file, handleFileProgress);
      console.log('✅ 文件处理完成');
    } catch (error) {
      console.error('❌ 文件处理失败:', error);
      alert(`文件处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [fileProcessorHook, handleFileProgress]);
  
  // 执行真实导入
  const handleRealImport = useCallback(async () => {
    if (!fileProcessorHook.parseResult) {
      alert('请先选择并处理Excel文件');
      return;
    }
    
    if (!importConfig.periodId) {
      alert('请选择薪资周期');
      return;
    }
    
    try {
      console.log('🚀 开始真实导入...', importConfig);
      const result = await fileProcessorHook.performRealImport(importConfig, handleImportProgress);
      console.log('✅ 导入完成:', result);
      
      if (result.success) {
        alert(`导入成功！处理了 ${result.successCount}/${result.totalRows} 条记录`);
      } else {
        alert(`导入失败：${result.errors.map(e => e.message).join('; ')}`);
      }
    } catch (error) {
      console.error('❌ 导入失败:', error);
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [fileProcessorHook, importConfig, handleImportProgress]);
  
  // 重置所有状态
  const handleReset = useCallback(() => {
    fileProcessorHook.clearResults();
    setCurrentProgress(null);
    setProcessingPhase('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [fileProcessorHook]);
  
  const statistics = fileProcessorHook.getStatistics();
  const importHistory = fileProcessorHook.getImportHistory();
  
  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-base-content mb-4">
            🔧 增强版文件处理器测试
          </h1>
          <p className="text-lg text-base-content/70 mb-2">
            测试真实Excel文件处理和Supabase数据导入功能
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <span className={`badge ${fileProcessorHook.parseResult ? 'badge-success' : 'badge-warning'}`}>
              {fileProcessorHook.parseResult ? '✓ 文件已解析' : '⏳ 待处理文件'}
            </span>
            <span className={`badge ${fileProcessorHook.isRealImporting ? 'badge-info' : 'badge-ghost'}`}>
              {fileProcessorHook.isRealImporting ? '🔄 导入中' : '⏸ 待导入'}
            </span>
          </div>
        </div>
        
        {/* 文件上传区域 */}
        <div className={cn(cardEffects.primary, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">📁 Excel文件处理</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="file-input file-input-bordered flex-1"
                disabled={fileProcessorHook.isProcessing || fileProcessorHook.isRealImporting}
              />
              <button
                className="btn btn-outline"
                onClick={handleReset}
                disabled={fileProcessorHook.isProcessing || fileProcessorHook.isRealImporting}
              >
                重置
              </button>
            </div>
            
            {/* 处理进度显示 */}
            {fileProcessorHook.isProcessing && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  <span className="font-medium">{processingPhase}</span>
                </div>
                <div className="w-full bg-base-300 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${fileProcessorHook.processingProgress}%` }}
                  />
                </div>
                <div className="text-sm text-base-content/70 mt-1">
                  {fileProcessorHook.processingProgress}% 完成
                </div>
              </div>
            )}
            
            {/* 文件解析结果 */}
            {fileProcessorHook.parseResult && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">文件信息</div>
                  <div className="stat-value text-sm">{fileProcessorHook.parseResult.fileName}</div>
                  <div className="stat-desc">
                    {Math.round(fileProcessorHook.parseResult.fileSize / 1024)}KB | {statistics.totalSheets}个工作表
                  </div>
                </div>
                
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">数据统计</div>
                  <div className="stat-value text-lg">{statistics.validRows}</div>
                  <div className="stat-desc">
                    有效记录 / {statistics.totalRows}总记录
                  </div>
                </div>
                
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">员工数量</div>
                  <div className="stat-value text-lg">{statistics.uniqueEmployees}</div>
                  <div className="stat-desc">
                    识别到的唯一员工数量
                  </div>
                </div>
              </div>
            )}
            
            {/* 数据类型检测结果 */}
            {statistics.dataTypes.length > 0 && (
              <div className="bg-success/10 p-4 rounded-lg border border-success/20">
                <h3 className="font-semibold text-success mb-2">✅ 检测到的数据类型</h3>
                <div className="flex flex-wrap gap-2">
                  {statistics.dataTypes.map(dataType => (
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
        </div>
        
        {/* 导入配置 */}
        {fileProcessorHook.parseResult && (
          <div className={cn(cardEffects.secondary, 'p-6')}>
            <h2 className="text-2xl font-bold mb-4">⚙️ 导入配置</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">薪资周期</label>
                {isLoadingMonths ? (
                  <div className="skeleton h-12 w-full"></div>
                ) : (
                  <select
                    className="select select-bordered w-full"
                    value={importConfig.periodId}
                    onChange={(e) => setImportConfig(prev => ({ ...prev, periodId: e.target.value }))}
                    disabled={fileProcessorHook.isRealImporting}
                  >
                    <option value="">选择薪资周期...</option>
                    {availableMonths?.map(period => (
                      <option key={period.month} value={`period_${period.month}`}>
                        {period.month} ({period.payrollCount}条记录)
                      </option>
                    )) || <option value="mock_period">模拟周期 (测试用)</option>}
                  </select>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">导入模式</label>
                <select
                  className="select select-bordered w-full"
                  value={importConfig.mode}
                  onChange={(e) => setImportConfig(prev => ({ ...prev, mode: e.target.value as ImportMode }))}
                  disabled={fileProcessorHook.isRealImporting}
                >
                  <option value="upsert">UPSERT (更新或插入)</option>
                  <option value="replace">REPLACE (完全替换)</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">薪资组件类别</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { key: 'basic_salary', label: '基本薪资' },
                  { key: 'benefits', label: '福利补贴' },
                  { key: 'personal_tax', label: '个人所得税' },
                  { key: 'other_deductions', label: '其他扣除' }
                ].map(category => (
                  <label key={category.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={importConfig.includeCategories?.includes(category.key as SalaryComponentCategory) || false}
                      onChange={(e) => {
                        const currentCategories = importConfig.includeCategories || [];
                        const newCategories = e.target.checked
                          ? [...currentCategories, category.key as SalaryComponentCategory]
                          : currentCategories.filter(c => c !== category.key);
                        setImportConfig(prev => ({ ...prev, includeCategories: newCategories }));
                      }}
                      disabled={fileProcessorHook.isRealImporting}
                    />
                    <span className="text-sm">{category.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* 导入操作 */}
        {fileProcessorHook.parseResult && (
          <div className={cn(cardEffects.accent, 'p-6')}>
            <h2 className="text-2xl font-bold mb-4">🚀 数据导入</h2>
            
            {/* 导入进度 */}
            {fileProcessorHook.isRealImporting && currentProgress && (
              <div className="bg-info/5 p-4 rounded-lg border border-info/20 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  <span className="font-medium">{processingPhase}</span>
                </div>
                
                {currentProgress.current && (
                  <div className="mb-2">
                    <div className="text-sm">
                      当前: {currentProgress.current.groupName} - 
                      {currentProgress.current.processedRecords}/{currentProgress.current.totalRecords} 记录
                    </div>
                    <div className="w-full bg-base-300 rounded-full h-2">
                      <div 
                        className="bg-info h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.round((currentProgress.current.processedRecords / currentProgress.current.totalRecords) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {currentProgress.global && (
                  <div className="text-xs text-base-content/70">
                    全局进度: {currentProgress.global.processedRecords}/{currentProgress.global.totalRecords} 记录
                  </div>
                )}
              </div>
            )}
            
            {/* 导入结果 */}
            {fileProcessorHook.realImportResult && (
              <div className={`alert ${fileProcessorHook.realImportResult.success ? 'alert-success' : 'alert-error'} mb-4`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={
                    fileProcessorHook.realImportResult.success 
                      ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  } />
                </svg>
                <div>
                  <h3 className="font-bold">
                    {fileProcessorHook.realImportResult.success ? '✅ 导入成功' : '❌ 导入失败'}
                  </h3>
                  <div className="text-sm">
                    {fileProcessorHook.realImportResult.success 
                      ? `成功处理 ${fileProcessorHook.realImportResult.successCount}/${fileProcessorHook.realImportResult.totalRows} 条记录，用时 ${Math.round(fileProcessorHook.realImportResult.duration / 1000)}秒`
                      : `错误数量: ${fileProcessorHook.realImportResult.errors.length}`
                    }
                  </div>
                  
                  {/* 显示错误详情 */}
                  {fileProcessorHook.realImportResult.errors.length > 0 && (
                    <div className="mt-2">
                      <details className="text-sm">
                        <summary className="cursor-pointer">查看错误详情</summary>
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          {fileProcessorHook.realImportResult.errors.slice(0, 10).map((error, index) => (
                            <div key={index} className="text-xs p-1 border-l-2 border-error/20 pl-2 mb-1">
                              行{error.row}: {error.message}
                            </div>
                          ))}
                          {fileProcessorHook.realImportResult.errors.length > 10 && (
                            <div className="text-xs text-base-content/50">
                              ...还有 {fileProcessorHook.realImportResult.errors.length - 10} 个错误
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 操作按钮 */}
            <div className="flex gap-4">
              <button
                className={`btn btn-primary ${(!importConfig.periodId || fileProcessorHook.isRealImporting) ? 'btn-disabled' : ''}`}
                onClick={handleRealImport}
                disabled={!importConfig.periodId || fileProcessorHook.isRealImporting}
              >
                {fileProcessorHook.isRealImporting ? '导入中...' : '开始真实导入'}
              </button>
              
              <button
                className="btn btn-info btn-outline"
                onClick={() => console.log('当前状态:', {
                  parseResult: fileProcessorHook.parseResult,
                  consistencyResult: fileProcessorHook.consistencyResult,
                  statistics,
                  importConfig,
                  importHistory
                })}
              >
                调试输出
              </button>
            </div>
          </div>
        )}
        
        {/* 导入历史 */}
        {importHistory.length > 0 && (
          <div className={cn(cardEffects.elevated, 'p-6')}>
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
                  {importHistory.slice(0, 10).map((history, index) => (
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
        
        {/* 技术说明 */}
        <div className={cn(cardEffects.primary, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">🔧 技术架构说明</h2>
          
          <div className="prose prose-sm max-w-none">
            <h3>增强Hook功能:</h3>
            <ul>
              <li><strong>继承原有功能</strong>: Excel解析、数据验证、一致性检查</li>
              <li><strong>新增真实导入</strong>: 集成 importPayrollItems 函数</li>
              <li><strong>进度跟踪</strong>: 统一的进度报告机制</li>
              <li><strong>错误处理</strong>: 完整的错误捕获和用户反馈</li>
              <li><strong>导入历史</strong>: 保存操作记录供查看和调试</li>
            </ul>
            
            <h3>当前实现状态:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-success/10 p-3 rounded border border-success/20">
                <h4 className="font-semibold text-success">✅ 已实现</h4>
                <ul className="text-sm mt-1">
                  <li>• Excel文件解析和验证</li>
                  <li>• 真实Supabase数据写入</li>
                  <li>• 完整的进度跟踪</li>
                  <li>• 错误处理和回滚</li>
                  <li>• 导入历史记录</li>
                </ul>
              </div>
              
              <div className="bg-warning/10 p-3 rounded border border-warning/20">
                <h4 className="font-semibold text-warning">⏳ 待完善</h4>
                <ul className="text-sm mt-1">
                  <li>• 多数据类型支持 (目前仅薪资明细)</li>
                  <li>• 高级验证规则</li>
                  <li>• 性能优化 (大文件处理)</li>
                  <li>• 详细的导入报告</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFileProcessorTest;