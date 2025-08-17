/**
 * 增强导入功能使用示例
 * 展示如何使用新的批处理和进度管理功能
 */

import React, { useState } from 'react';
import { usePayrollImportExport } from '@/hooks/payroll/usePayrollImportExport';
import { EnhancedImportProgressComponent } from '@/components/payroll/EnhancedImportProgress';
import { ImportConfig } from '@/hooks/payroll/usePayrollImportExport';
import { ImportDataGroup } from '@/types/payroll-import';

export const EnhancedImportExample: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    dataGroup: ImportDataGroup.ALL,
    options: {
      validateBeforeImport: true,
      skipDuplicates: true,
      createMissingRecords: true
    }
  });

  const {
    // 增强的进度状态
    enhancedProgress,
    importProgress,
    
    // 操作方法
    actions: {
      importExcelEnhanced,
      cancelImport
    },
    
    // 控制状态
    control: {
      canCancel,
      isCancelling
    },
    
    // 工具函数
    utils: {
      getProgressPercentage,
      getCurrentGroupPercentage,
      getPerformanceMetrics,
      formatDuration,
      formatFileSize
    },
    
    // 加载状态
    loading
  } = usePayrollImportExport();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert('请选择要导入的文件');
      return;
    }

    try {
      await importExcelEnhanced({
        file: selectedFile,
        config: importConfig,
        periodId: new Date().toISOString().slice(0, 7) // 使用当前月份
      });
    } catch (error) {
      console.error('导入失败:', error);
    }
  };

  const performanceMetrics = getPerformanceMetrics();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* 标题 */}
        <div>
          <h1 className="text-2xl font-bold">增强导入功能示例</h1>
          <p className="text-base-content/70 mt-2">
            演示批处理、进度管理和取消操作功能
          </p>
        </div>

        {/* 文件选择和配置 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">导入配置</h2>
            
            {/* 文件选择 */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">选择Excel文件</span>
              </label>
              <input 
                type="file" 
                className="file-input file-input-bordered w-full"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading.import}
              />
              {selectedFile && (
                <label className="label">
                  <span className="label-text-alt">
                    已选择: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </span>
                </label>
              )}
            </div>

            {/* 数据组选择 */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">数据组</span>
              </label>
              <select 
                className="select select-bordered"
                value={importConfig.dataGroup}
                onChange={(e) => setImportConfig(prev => ({
                  ...prev,
                  dataGroup: e.target.value as ImportDataGroup
                }))}
                disabled={loading.import}
              >
                <option value={ImportDataGroup.ALL}>全部数据</option>
                <option value={ImportDataGroup.EARNINGS}>薪资项目明细</option>
                <option value={ImportDataGroup.CONTRIBUTION_BASES}>缴费基数</option>
                <option value={ImportDataGroup.CATEGORY_ASSIGNMENT}>人员类别</option>
                <option value={ImportDataGroup.JOB_ASSIGNMENT}>职务信息</option>
              </select>
            </div>

            {/* 导入选项 */}
            <div className="space-y-2">
              <label className="label">
                <span className="label-text">导入选项</span>
              </label>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">导入前验证数据</span>
                  <input 
                    type="checkbox" 
                    className="checkbox"
                    checked={importConfig.options?.validateBeforeImport || false}
                    onChange={(e) => setImportConfig(prev => ({
                      ...prev,
                      options: {
                        ...prev.options,
                        validateBeforeImport: e.target.checked
                      }
                    }))}
                    disabled={loading.import}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">跳过重复记录</span>
                  <input 
                    type="checkbox" 
                    className="checkbox"
                    checked={importConfig.options?.skipDuplicates || false}
                    onChange={(e) => setImportConfig(prev => ({
                      ...prev,
                      options: {
                        ...prev.options,
                        skipDuplicates: e.target.checked
                      }
                    }))}
                    disabled={loading.import}
                  />
                </label>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="card-actions justify-end">
              <button 
                className={`btn btn-primary ${loading.import ? 'loading' : ''}`}
                onClick={handleImport}
                disabled={!selectedFile || loading.import}
              >
                {loading.import ? '导入中...' : '开始导入'}
              </button>
            </div>
          </div>
        </div>

        {/* 基础进度显示 */}
        {!enhancedProgress && importProgress.phase !== 'parsing' && (
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">基础进度</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>总进度</span>
                    <span>{getProgressPercentage()}%</span>
                  </div>
                  <progress 
                    className="progress progress-primary w-full" 
                    value={getProgressPercentage()} 
                    max="100"
                  ></progress>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>当前组进度</span>
                    <span>{getCurrentGroupPercentage()}%</span>
                  </div>
                  <progress 
                    className="progress progress-secondary w-full" 
                    value={getCurrentGroupPercentage()} 
                    max="100"
                  ></progress>
                </div>

                <div className="text-sm">
                  <div>阶段: {importProgress.phase}</div>
                  <div>当前组: {importProgress.current.groupName}</div>
                  <div>进度: {importProgress.global.processedGroups}/{importProgress.global.totalGroups} 组</div>
                  {importProgress.message && (
                    <div className="text-xs opacity-70 mt-1">{importProgress.message}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 增强进度显示 */}
        {enhancedProgress && (
          <EnhancedImportProgressComponent
            progress={enhancedProgress}
            onCancel={canCancel ? cancelImport : undefined}
          />
        )}

        {/* 性能指标面板 */}
        {performanceMetrics && (
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">性能监控</h2>
              <div className="stats stats-vertical lg:stats-horizontal w-full">
                <div className="stat">
                  <div className="stat-title">平均处理时间</div>
                  <div className="stat-value text-base">
                    {performanceMetrics.averageProcessingTime.toFixed(1)}ms
                  </div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">预估剩余时间</div>
                  <div className="stat-value text-base">
                    {performanceMetrics.estimatedTimeRemaining 
                      ? formatDuration(performanceMetrics.estimatedTimeRemaining)
                      : '--'
                    }
                  </div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">当前批次大小</div>
                  <div className="stat-value text-base">
                    {performanceMetrics.currentBatchSize}
                  </div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">处理速度</div>
                  <div className="stat-value text-base">
                    {performanceMetrics.processingSpeed?.toFixed(1) || '--'} 条/秒
                  </div>
                </div>
              </div>
              
              {performanceMetrics.memoryUsage && (
                <div className="mt-4">
                  <div className="text-sm">内存使用: {performanceMetrics.memoryUsage.toFixed(1)} MB</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 功能说明 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">功能特性</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="badge badge-success badge-sm mt-0.5">✓</div>
                <div>
                  <strong>智能批处理:</strong> 自动调整批次大小，根据性能动态优化处理速度
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="badge badge-success badge-sm mt-0.5">✓</div>
                <div>
                  <strong>权重进度计算:</strong> 根据操作复杂度分配权重，提供更准确的进度预估
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="badge badge-success badge-sm mt-0.5">✓</div>
                <div>
                  <strong>进度节流:</strong> 避免频繁UI更新，提升用户体验
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="badge badge-success badge-sm mt-0.5">✓</div>
                <div>
                  <strong>取消操作:</strong> 支持随时取消长时间运行的导入操作
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="badge badge-success badge-sm mt-0.5">✓</div>
                <div>
                  <strong>性能监控:</strong> 实时监控处理速度、内存使用和预估剩余时间
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="badge badge-success badge-sm mt-0.5">✓</div>
                <div>
                  <strong>向后兼容:</strong> 保持与现有代码的完全兼容性
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};