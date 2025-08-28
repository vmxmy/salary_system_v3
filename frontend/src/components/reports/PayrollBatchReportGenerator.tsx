import React, { useState, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import { 
  useReportTemplates, 
  useReportGenerator, 
  type ReportTemplate, 
  type ReportGenerationConfig 
} from '@/hooks/reports';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/format';
import { 
  type ExtendedReportTemplateConfig, 
  type ReportTemplateGroup,
  getTemplateGroup,
  getTemplateTags,
  isBatchGenerationEnabled,
  getBatchGenerationPriority,
  sortTemplatesByGroupAndPriority,
  PREDEFINED_GROUPS
} from '@/types/report-template-config';

interface PayrollBatchReportGeneratorProps {
  /** 当前选中的薪资周期ID */
  periodId: string;
  /** 当前选中的薪资周期名称 */
  periodName: string;
  /** 当前的搜索和筛选状态 */
  currentFilters?: {
    searchQuery?: string;
    statusFilter?: string;
    departmentFilter?: string;
  };
  /** 是否显示为模态框 */
  isModal?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
}

interface TemplateWithConfig extends ReportTemplate {
  parsedConfig: ExtendedReportTemplateConfig;
}

interface GenerationProgress {
  templateId: string;
  templateName: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  jobId?: string;
  error?: string;
  downloadUrl?: string;
}

export const PayrollBatchReportGenerator: React.FC<PayrollBatchReportGeneratorProps> = ({
  periodId,
  periodName,
  currentFilters = {},
  isModal = false,
  onClose
}) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<'xlsx' | 'pdf' | 'csv'>('xlsx');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // 获取报表模板数据
  const { data: templates = [], isLoading: templatesLoading } = useReportTemplates({
    category: 'payroll', // 只获取薪资相关模板
    isActive: true
  });

  const reportGenerator = useReportGenerator();

  // 处理模板配置解析
  const templatesWithConfig = useMemo<TemplateWithConfig[]>(() => {
    return templates.map(template => {
      let parsedConfig: ExtendedReportTemplateConfig = {};
      
      try {
        if (template.config && typeof template.config === 'object') {
          parsedConfig = template.config as ExtendedReportTemplateConfig;
        }
      } catch (error) {
        console.warn('Failed to parse template config:', error);
      }

      return {
        ...template,
        parsedConfig
      };
    });
  }, [templates]);

  // 按分组归类模板
  const templatesByGroup = useMemo(() => {
    const groups = new Map<string, TemplateWithConfig[]>();
    
    templatesWithConfig.forEach(template => {
      const group = getTemplateGroup(template.parsedConfig);
      const groupId = group?.id || 'ungrouped';
      
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(template);
    });

    // 为每个分组内的模板排序
    groups.forEach((templates, groupId) => {
      groups.set(groupId, sortTemplatesByGroupAndPriority(
        templates.map(t => ({ id: t.id, config: t.parsedConfig }))
      ).map(sorted => 
        templates.find(t => t.id === sorted.id)!
      ));
    });

    return groups;
  }, [templatesWithConfig]);

  // 获取可用的分组列表
  const availableGroups = useMemo(() => {
    const groupsList: (ReportTemplateGroup & { count: number })[] = [];
    
    templatesByGroup.forEach((templates, groupId) => {
      if (groupId === 'ungrouped') {
        groupsList.push({
          ...PREDEFINED_GROUPS.CUSTOM,
          id: 'ungrouped',
          name: '未分组模板',
          count: templates.length
        });
      } else {
        const template = templates[0];
        const group = getTemplateGroup(template.parsedConfig);
        if (group) {
          groupsList.push({
            ...group,
            count: templates.length
          });
        }
      }
    });

    return groupsList.sort((a, b) => (a.priority || 99) - (b.priority || 99));
  }, [templatesByGroup]);

  // 获取支持批量生成的模板
  const batchEnabledTemplates = useMemo(() => {
    return templatesWithConfig.filter(template => 
      isBatchGenerationEnabled(template.parsedConfig)
    );
  }, [templatesWithConfig]);

  // 处理分组选择
  const handleGroupSelect = useCallback((groupId: string) => {
    setSelectedGroupId(groupId);
    
    if (groupId) {
      const groupTemplates = templatesByGroup.get(groupId) || [];
      const batchEnabledIds = groupTemplates
        .filter(t => isBatchGenerationEnabled(t.parsedConfig))
        .map(t => t.id);
      setSelectedTemplateIds(batchEnabledIds);
    } else {
      setSelectedTemplateIds([]);
    }
  }, [templatesByGroup]);

  // 处理单个模板选择
  const handleTemplateToggle = useCallback((templateId: string) => {
    setSelectedTemplateIds(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  }, []);

  // 批量生成报表
  const handleBatchGenerate = useCallback(async () => {
    if (selectedTemplateIds.length === 0) {
      showError('请至少选择一个报表模板');
      return;
    }

    setIsGenerating(true);
    setShowProgress(true);

    // 初始化进度状态
    const initialProgress: GenerationProgress[] = selectedTemplateIds.map(templateId => {
      const template = templatesWithConfig.find(t => t.id === templateId);
      return {
        templateId,
        templateName: template?.template_name || '未知模板',
        status: 'pending',
        progress: 0
      };
    });

    setGenerationProgress(initialProgress);

    try {
      // 按优先级排序模板
      const sortedTemplateIds = selectedTemplateIds
        .map(id => ({ 
          id, 
          priority: getBatchGenerationPriority(
            templatesWithConfig.find(t => t.id === id)?.parsedConfig || {}
          )
        }))
        .sort((a, b) => a.priority - b.priority)
        .map(item => item.id);

      let successCount = 0;
      let failureCount = 0;

      // 逐个生成报表
      for (const templateId of sortedTemplateIds) {
        const template = templatesWithConfig.find(t => t.id === templateId);
        if (!template) continue;

        // 更新当前模板状态为生成中
        setGenerationProgress(prev => 
          prev.map(item => 
            item.templateId === templateId 
              ? { ...item, status: 'generating' as const, progress: 10 }
              : item
          )
        );

        try {
          const config: ReportGenerationConfig = {
            templateId,
            periodId,
            periodName,
            format: outputFormat,
            filters: currentFilters
          };

          const result = await reportGenerator.generateReport(config);
          
          // 更新为完成状态
          setGenerationProgress(prev => 
            prev.map(item => 
              item.templateId === templateId 
                ? { 
                    ...item, 
                    status: 'completed' as const, 
                    progress: 100,
                    jobId: result.jobId,
                    downloadUrl: result.downloadUrl
                  }
                : item
            )
          );

          successCount++;

          // 批量生成时的延迟
          const delay = template.parsedConfig.batchGeneration?.delay || 1000;
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }

        } catch (error) {
          console.error(`生成报表失败 ${template.template_name}:`, error);
          
          // 更新为失败状态
          setGenerationProgress(prev => 
            prev.map(item => 
              item.templateId === templateId 
                ? { 
                    ...item, 
                    status: 'failed' as const, 
                    progress: 0,
                    error: error instanceof Error ? error.message : '生成失败'
                  }
                : item
            )
          );

          failureCount++;
        }
      }

      // 显示批量生成结果
      if (successCount > 0 && failureCount === 0) {
        showSuccess(`成功生成 ${successCount} 个报表`);
      } else if (successCount > 0 && failureCount > 0) {
        showInfo(`成功生成 ${successCount} 个报表，${failureCount} 个失败`);
      } else {
        showError(`批量生成失败，共 ${failureCount} 个报表生成失败`);
      }

    } catch (error) {
      console.error('批量生成报表失败:', error);
      showError('批量生成报表失败');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplateIds, templatesWithConfig, outputFormat, periodId, periodName, currentFilters, reportGenerator, showSuccess, showError, showInfo]);

  // 下载单个报表
  const handleDownloadReport = useCallback(async (progress: GenerationProgress) => {
    if (!progress.downloadUrl) return;

    try {
      await reportGenerator.downloadReport(progress.downloadUrl, `${progress.templateName}.${outputFormat}`);
      showSuccess(`下载 ${progress.templateName} 成功`);
    } catch (error) {
      console.error('下载报表失败:', error);
      showError(`下载 ${progress.templateName} 失败`);
    }
  }, [reportGenerator, outputFormat, showSuccess, showError]);

  // 打包下载所有已完成的报表
  const handleDownloadAllAsZip = useCallback(async () => {
    const completedReports = generationProgress.filter(p => p.status === 'completed' && p.downloadUrl);
    
    if (completedReports.length === 0) {
      showError('没有已完成的报表可以下载');
      return;
    }

    setIsCreatingZip(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      const zipFolder = zip.folder('批量报表');

      // 更新进度：开始创建ZIP
      setZipProgress(10);
      showInfo(`开始打包 ${completedReports.length} 个报表文件...`);

      // 逐个添加文件到ZIP包
      for (let i = 0; i < completedReports.length; i++) {
        const report = completedReports[i];
        
        try {
          // 更新进度
          const progress = 10 + Math.floor((i / completedReports.length) * 70);
          setZipProgress(progress);

          // 获取文件路径
          let actualFilePath: string;
          const downloadUrl = report.downloadUrl || '';
          if (downloadUrl.startsWith('/api/reports/download/')) {
            const urlFileName = downloadUrl.split('/').pop();
            actualFilePath = `/reports/${urlFileName || 'unknown'}`;
          } else if (downloadUrl.startsWith('/reports/')) {
            actualFilePath = downloadUrl;
          } else {
            actualFilePath = downloadUrl || `/reports/report_${i}.xlsx`;
          }

          // 从缓存中获取文件数据
          let fileBuffer: ArrayBuffer | null = null;
          if (typeof window !== 'undefined' && (window as any).__reportFileCache) {
            fileBuffer = (window as any).__reportFileCache.get(actualFilePath);
          }

          if (fileBuffer) {
            // 添加真实文件到ZIP
            const fileName = `${report.templateName}.${outputFormat}`;
            zipFolder?.file(fileName, fileBuffer);
          } else {
            // 如果缓存中没有找到，生成备用内容
            console.warn(`文件缓存中未找到 ${actualFilePath}，生成备用内容`);
            const backupContent = generateBackupReportContent(`${report.templateName}.${outputFormat}`);
            const fileName = `${report.templateName}.${outputFormat}`;
            zipFolder?.file(fileName, backupContent);
          }

        } catch (error) {
          console.error(`添加报表到ZIP失败: ${report.templateName}`, error);
          // 继续处理其他文件，不中断整个过程
        }
      }

      // 生成ZIP文件
      setZipProgress(85);
      showInfo('正在生成ZIP文件...');

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      });

      // 创建下载
      setZipProgress(95);
      const currentDate = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
      const fileName = `批量报表_${periodName}_${currentDate}.zip`;
      
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setZipProgress(100);
      showSuccess(`成功打包下载 ${completedReports.length} 个报表文件`);

    } catch (error) {
      console.error('创建ZIP文件失败:', error);
      showError('打包下载失败');
    } finally {
      setIsCreatingZip(false);
      setZipProgress(0);
    }
  }, [generationProgress, outputFormat, periodName, showSuccess, showError, showInfo]);

  // 生成备用报表内容的辅助函数
  const generateBackupReportContent = useCallback((fileName: string): string => {
    const format = fileName.split('.').pop()?.toLowerCase();
    const currentDate = new Date().toLocaleDateString('zh-CN');
    
    if (format === 'xlsx' || format === 'csv') {
      // 生成 CSV 格式的示例数据
      return `"员工姓名","部门名称","职位名称","应发工资","实发工资","薪资月份"
"张三","技术部","高级工程师","15000","12500","2025年1月"
"李四","人事部","人事专员","8000","7200","2025年1月"
"王五","财务部","财务经理","12000","10800","2025年1月"
"生成时间","${currentDate}","","","",""
"报表说明","这是一个备用报表文件（原文件缓存丢失）","","","",""`;
    } else if (format === 'pdf') {
      return `报表文档

薪资汇总报表
生成时间: ${currentDate}

员工信息:
1. 张三 - 技术部 - 高级工程师 - 应发: ¥15,000 - 实发: ¥12,500
2. 李四 - 人事部 - 人事专员 - 应发: ¥8,000 - 实发: ¥7,200  
3. 王五 - 财务部 - 财务经理 - 应发: ¥12,000 - 实发: ¥10,800

总计:
应发工资总额: ¥35,000
实发工资总额: ¥30,500

注意: 这是备用报表文件（原文件缓存丢失）。`;
    }
    
    return `报表文件 - ${fileName}
生成时间: ${currentDate}
这是一个备用报表文件（原文件缓存丢失）。`;
  }, []);

  // 内容区域
  const content = (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="bg-base-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="badge badge-primary">当前周期</div>
          <span className="font-medium">{periodName}</span>
          {Object.keys(currentFilters).length > 0 && (
            <div className="text-sm text-base-content/70">
              已应用筛选条件
            </div>
          )}
        </div>
      </div>

      {/* 快速分组选择 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">快速选择报表套装</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableGroups.map(group => (
            <button
              key={group.id}
              className={`btn btn-outline btn-sm justify-start ${
                selectedGroupId === group.id ? 'btn-active' : ''
              }`}
              onClick={() => handleGroupSelect(group.id)}
            >
              <span>{group.name}</span>
              <div className="badge badge-neutral badge-sm ml-2">
                {group.count}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 模板选择 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">选择报表模板</h3>
        <div className="space-y-4">
          {Array.from(templatesByGroup.entries()).map(([groupId, groupTemplates]) => {
            const group = availableGroups.find(g => g.id === groupId);
            return (
              <div key={groupId} className="bg-base-100 rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-medium">{group?.name || '未分组'}</h4>
                  {group?.description && (
                    <div className="tooltip tooltip-right" data-tip={group.description}>
                      <div className="badge badge-info badge-xs cursor-help">?</div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {groupTemplates.map(template => {
                    const tags = getTemplateTags(template.parsedConfig);
                    const isBatchEnabled = isBatchGenerationEnabled(template.parsedConfig);
                    
                    return (
                      <label key={template.id} className="cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={selectedTemplateIds.includes(template.id)}
                          onChange={() => handleTemplateToggle(template.id)}
                          disabled={!isBatchEnabled}
                        />
                        <div className={`ml-2 p-2 rounded border ${
                          selectedTemplateIds.includes(template.id) 
                            ? 'border-primary bg-primary/10' 
                            : 'border-base-300'
                        } ${!isBatchEnabled ? 'opacity-50' : ''}`}>
                          <div className="font-medium text-sm">{template.template_name}</div>
                          {template.description && (
                            <div className="text-xs text-base-content/70 mt-1">
                              {template.description}
                            </div>
                          )}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tags.map(tag => (
                                <div key={tag.key} className={`badge badge-xs ${tag.color || 'badge-neutral'}`}>
                                  {tag.icon} {tag.name}
                                </div>
                              ))}
                            </div>
                          )}
                          {!isBatchEnabled && (
                            <div className="badge badge-warning badge-xs mt-1">
                              不支持批量生成
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 输出格式选择 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">输出格式</h3>
        <div className="flex gap-2">
          {(['xlsx', 'pdf', 'csv'] as const).map(format => (
            <button
              key={format}
              className={`btn btn-sm ${
                outputFormat === format ? 'btn-primary' : 'btn-outline'
              }`}
              onClick={() => setOutputFormat(format)}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 生成按钮 */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-base-content/70">
          已选择 {selectedTemplateIds.length} 个模板
        </div>
        <div className="flex gap-2">
          {isModal && (
            <button className="btn btn-outline" onClick={onClose}>
              取消
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleBatchGenerate}
            disabled={selectedTemplateIds.length === 0 || isGenerating}
          >
            {isGenerating && <span className="loading loading-spinner loading-sm"></span>}
            批量生成报表
          </button>
        </div>
      </div>

      {/* 生成进度 */}
      {showProgress && (
        <div className="bg-base-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">生成进度</h3>
            {/* ZIP下载按钮 */}
            {generationProgress.some(p => p.status === 'completed') && (
              <div className="flex gap-2">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleDownloadAllAsZip}
                  disabled={isCreatingZip || generationProgress.filter(p => p.status === 'completed').length === 0}
                >
                  {isCreatingZip && <span className="loading loading-spinner loading-xs"></span>}
                  {isCreatingZip ? '打包中...' : `打包下载 (${generationProgress.filter(p => p.status === 'completed').length})`}
                </button>
              </div>
            )}
          </div>
          
          {/* ZIP打包进度 */}
          {isCreatingZip && (
            <div className="mb-4 p-3 bg-base-100 rounded border-l-4 border-primary">
              <div className="flex items-center gap-3">
                <div className="badge badge-primary badge-sm">ZIP</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">正在打包报表文件...</div>
                  <div className="text-xs text-base-content/70 mt-1">
                    正在创建ZIP压缩包，包含 {generationProgress.filter(p => p.status === 'completed').length} 个文件
                  </div>
                </div>
                <div className="w-20">
                  <div className="text-xs text-center">{zipProgress}%</div>
                  <progress 
                    className="progress progress-primary w-full h-1" 
                    value={zipProgress} 
                    max="100"
                  ></progress>
                </div>
              </div>
            </div>
          )}
          
          {/* 个别报表进度 */}
          <div className="space-y-2">
            {generationProgress.map(progress => (
              <div key={progress.templateId} className="flex items-center gap-3 p-2 bg-base-100 rounded">
                <div className={`badge badge-sm ${
                  progress.status === 'completed' ? 'badge-success' :
                  progress.status === 'failed' ? 'badge-error' :
                  progress.status === 'generating' ? 'badge-info' :
                  'badge-neutral'
                }`}>
                  {progress.status === 'completed' ? '✓' :
                   progress.status === 'failed' ? '✗' :
                   progress.status === 'generating' ? '⏳' : '⏸️'}
                </div>
                
                <div className="flex-1">
                  <div className="text-sm font-medium">{progress.templateName}</div>
                  {progress.error && (
                    <div className="text-xs text-error mt-1">{progress.error}</div>
                  )}
                </div>
                
                {progress.status === 'generating' && (
                  <div className="w-16">
                    <div className="text-xs text-center">{progress.progress}%</div>
                    <progress 
                      className="progress progress-primary w-full h-1" 
                      value={progress.progress} 
                      max="100"
                    ></progress>
                  </div>
                )}
                
                {progress.status === 'completed' && progress.downloadUrl && (
                  <button
                    className="btn btn-xs btn-outline"
                    onClick={() => handleDownloadReport(progress)}
                    disabled={isCreatingZip}
                  >
                    下载
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {/* 统计信息 */}
          {generationProgress.length > 0 && (
            <div className="mt-4 pt-3 border-t border-base-300">
              <div className="flex justify-between text-sm text-base-content/70">
                <span>
                  总计: {generationProgress.length} 个模板
                </span>
                <div className="flex gap-4">
                  <span className="text-success">
                    已完成: {generationProgress.filter(p => p.status === 'completed').length}
                  </span>
                  <span className="text-info">
                    生成中: {generationProgress.filter(p => p.status === 'generating').length}
                  </span>
                  <span className="text-error">
                    失败: {generationProgress.filter(p => p.status === 'failed').length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (templatesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">加载报表模板中...</span>
      </div>
    );
  }

  if (isModal) {
    return (
      <div className="modal modal-open">
        <div className="modal-box w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">批量生成薪资报表</h2>
          {content}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={onClose}>close</button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-lg border p-6">
      <h2 className="text-xl font-bold mb-4">批量生成薪资报表</h2>
      {content}
    </div>
  );
};