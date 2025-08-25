/**
 * 真实数据导入测试组件
 * 展示当前系统能否真正进行数据库写入操作
 */

import React, { useState, useCallback } from 'react';
import { SimpleImportContextProvider, useSimpleImportContext } from '../context/SimpleImportContext';
import { ImportDataGroup } from '@/types/payroll-import';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';
import { useAvailablePayrollMonths } from '@/hooks/payroll/useAvailablePayrollMonths';

// 模拟真实导入器
const mockRealImporter = async (
  file: File,
  config: {
    selectedMonth: string;
    selectedDataGroups: ImportDataGroup[];
  },
  onProgress: (progress: number, message: string) => void
): Promise<{ success: boolean; recordsProcessed: number; error?: string }> => {
  
  // 模拟真实的Excel文件处理
  onProgress(10, '读取Excel文件...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  onProgress(30, '解析工作表数据...');
  await new Promise(resolve => setTimeout(resolve, 800));
  
  onProgress(50, '验证数据格式...');
  await new Promise(resolve => setTimeout(resolve, 600));
  
  onProgress(70, '连接数据库...');
  await new Promise(resolve => setTimeout(resolve, 400));
  
  // 这里是关键：目前只是模拟，没有实际数据库操作
  onProgress(90, '写入数据库...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  onProgress(100, '导入完成');
  
  return {
    success: true,
    recordsProcessed: Math.floor(Math.random() * 200) + 50,
    error: undefined
  };
};

/**
 * 真实导入测试内容组件
 */
const RealImportTestContent: React.FC = () => {
  const context = useSimpleImportContext();
  const [importResult, setImportResult] = useState<{
    success: boolean;
    recordsProcessed: number;
    error?: string;
  } | null>(null);
  const [isRealImporting, setIsRealImporting] = useState(false);
  const [realProgress, setRealProgress] = useState({ progress: 0, message: '' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // 获取真实数据
  const { data: availableMonths, isLoading: isLoadingMonths } = useAvailablePayrollMonths();
  
  // 处理真实导入
  const handleRealImport = useCallback(async () => {
    const fileInput = fileInputRef.current;
    if (!fileInput?.files?.[0]) {
      alert('请先选择Excel文件');
      return;
    }
    
    if (!context.currentState.canProceed) {
      alert('请完成配置设置（月份和数据组选择）');
      return;
    }
    
    const file = fileInput.files[0];
    
    try {
      setIsRealImporting(true);
      setImportResult(null);
      
      // 开始导入流程
      await context.startImport();
      
      // 调用真实导入器（目前是模拟）
      const result = await mockRealImporter(
        file,
        {
          selectedMonth: context.currentState.selectedMonth,
          selectedDataGroups: context.currentState.selectedDataGroups
        },
        (progress, message) => {
          setRealProgress({ progress, message });
          context.notifyProgress({
            phase: progress < 70 ? context.progress.phase : 'data_import' as any,
            progress,
            message
          });
        }
      );
      
      setImportResult(result);
      
      if (result.success) {
        await context.completeImport();
      }
      
    } catch (error) {
      console.error('导入失败:', error);
      setImportResult({
        success: false,
        recordsProcessed: 0,
        error: String(error)
      });
      
      context.notifyError({
        source: 'process',
        message: `导入失败: ${error}`
      });
    } finally {
      setIsRealImporting(false);
    }
  }, [context]);

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-base-content mb-4">
            🔄 真实数据导入测试
          </h1>
          <p className="text-lg text-base-content/70 mb-2">
            验证系统是否能够执行真实的数据库写入操作
          </p>
        </div>

        {/* 功能说明 */}
        <div className={cn(cardEffects.primary, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">⚠️ 当前功能状态</h2>
          
          <div className="alert alert-warning mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="font-bold">测试模块功能限制说明</h3>
              <div className="text-sm mt-2">
                当前重构的测试模块主要专注于<strong>组件架构验证</strong>，不包含完整的真实数据写入功能
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-success/10 p-4 rounded-lg border border-success/20">
              <h3 className="font-semibold text-success mb-2">✅ 已实现功能</h3>
              <ul className="text-sm space-y-1">
                <li>• Excel文件读取和解析 (useFileProcessor Hook)</li>
                <li>• 数据验证和格式检查</li>
                <li>• 组件间状态同步 (SimpleImportContext)</li>
                <li>• 真实月份数据加载 (Supabase集成)</li>
                <li>• 完整的UI交互流程</li>
                <li>• 进度跟踪和错误处理</li>
              </ul>
            </div>
            
            <div className="bg-warning/10 p-4 rounded-lg border border-warning/20">
              <h3 className="font-semibold text-warning mb-2">⏳ 待集成功能</h3>
              <ul className="text-sm space-y-1">
                <li>• 真实数据库写入操作</li>
                <li>• 完整的薪资导入业务逻辑</li>
                <li>• 数据冲突处理策略</li>
                <li>• 导入结果持久化</li>
                <li>• 审核和批准工作流</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 模拟导入测试 */}
        <div className={cn(cardEffects.secondary, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">🧪 模拟导入流程测试</h2>
          
          <div className="space-y-4">
            {/* 配置区 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">选择月份</label>
                <select
                  className="select select-bordered w-full"
                  value={context.currentState.selectedMonth}
                  onChange={(e) => context.notifyConfigChange({ month: e.target.value })}
                  disabled={isRealImporting}
                >
                  {availableMonths?.map(month => (
                    <option key={month.month} value={month.month}>
                      {month.month} ({month.payrollCount}条记录)
                    </option>
                  )) || <option value="2025-01">2025-01 (模拟数据)</option>}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">选择数据组</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: ImportDataGroup.EARNINGS, label: '薪资明细' },
                    { key: ImportDataGroup.CONTRIBUTION_BASES, label: '缴费基数' }
                  ].map(group => (
                    <label key={group.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={context.currentState.selectedDataGroups.includes(group.key)}
                        onChange={(e) => {
                          const currentGroups = context.currentState.selectedDataGroups;
                          const newGroups = e.target.checked
                            ? [...currentGroups, group.key]
                            : currentGroups.filter(g => g !== group.key);
                          context.notifyConfigChange({ dataGroups: newGroups });
                        }}
                        disabled={isRealImporting}
                      />
                      <span className="text-sm">{group.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 文件选择 */}
            <div>
              <label className="block text-sm font-medium mb-2">选择Excel文件</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="file-input file-input-bordered w-full"
                disabled={isRealImporting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    context.notifyFileChange({
                      hasFile: true,
                      fileName: file.name,
                      fileSize: file.size
                    });
                  }
                }}
              />
            </div>
            
            {/* 进度显示 */}
            {isRealImporting && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  <span className="font-medium">正在导入: {realProgress.message}</span>
                </div>
                <div className="w-full bg-base-300 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${realProgress.progress}%` }}
                  />
                </div>
                <div className="text-sm text-base-content/70 mt-1">
                  {realProgress.progress}% 完成
                </div>
              </div>
            )}
            
            {/* 导入结果 */}
            {importResult && (
              <div className={`alert ${importResult.success ? 'alert-success' : 'alert-error'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={
                    importResult.success 
                      ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  } />
                </svg>
                <div>
                  <h3 className="font-bold">
                    {importResult.success ? '模拟导入成功' : '模拟导入失败'}
                  </h3>
                  <div className="text-sm">
                    {importResult.success 
                      ? `模拟处理了 ${importResult.recordsProcessed} 条记录 (实际未写入数据库)`
                      : `错误: ${importResult.error}`
                    }
                  </div>
                </div>
              </div>
            )}
            
            {/* 操作按钮 */}
            <div className="flex gap-4">
              <button
                className={`btn btn-primary ${(!context.currentState.canProceed || isRealImporting) ? 'btn-disabled' : ''}`}
                onClick={handleRealImport}
                disabled={!context.currentState.canProceed || isRealImporting}
              >
                {isRealImporting ? '导入中...' : '开始模拟导入'}
              </button>
              
              <button
                className="btn btn-outline"
                onClick={() => {
                  context.resetImport();
                  setImportResult(null);
                  setRealProgress({ progress: 0, message: '' });
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={isRealImporting}
              >
                重置
              </button>
            </div>
          </div>
        </div>

        {/* 技术说明 */}
        <div className={cn(cardEffects.accent, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">🔧 技术架构说明</h2>
          
          <div className="prose prose-sm max-w-none">
            <h3>当前重构成果:</h3>
            <ul>
              <li><strong>useFileProcessor Hook</strong>: 600+行Excel处理逻辑，支持多工作表解析和数据验证</li>
              <li><strong>SimpleImportContext</strong>: 统一的组件间通信和状态管理</li>
              <li><strong>模块化组件架构</strong>: 将26000+行单体组件重构为可维护的模块</li>
              <li><strong>真实数据集成</strong>: 与Supabase数据库的月份数据加载</li>
            </ul>
            
            <h3>集成真实导入的技术路径:</h3>
            <ol>
              <li>将现有的 <code>/hooks/payroll/import-export/importers/</code> 中的导入器集成到 useFileProcessor</li>
              <li>添加数据库写入逻辑到 SimpleImportContext 的 startImport 方法</li>
              <li>实现完整的错误处理和回滚机制</li>
              <li>添加导入结果的持久化和审核工作流</li>
            </ol>
            
            <div className="alert alert-info mt-4">
              <span className="text-sm">
                💡 当前系统已有完整的真实导入功能（在 <code>src/hooks/payroll/import-export/</code>），
                本次重构专注于前端组件架构优化。真实导入功能的集成是下一个开发阶段的工作。
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 真实导入测试组件
 */
export const RealImportTest: React.FC = () => {
  return (
    <SimpleImportContextProvider
      debug={true}
      initialConfig={{
        month: '2025-01',
        dataGroups: [ImportDataGroup.EARNINGS]
      }}
      onComplete={(result) => {
        console.log('🎉 模拟导入完成:', result);
      }}
    >
      <RealImportTestContent />
    </SimpleImportContextProvider>
  );
};

export default RealImportTest;