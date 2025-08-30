/**
 * Reports Hooks 统一导出文件
 * 
 * 该模块提供了完整的报表管理功能，包括：
 * - 报表模板管理 (CRUD, 配置管理)
 * - 报表生成 (任务管理、进度监控、格式转换)
 * - 报表历史 (下载管理、记录追踪)
 * - 数据源管理 (字段映射、数据库集成)
 * - 统计分析 (使用情况、性能监控)
 */

// 核心报表管理 - 真实 Supabase 集成
import {
  useReportTemplates as useReportTemplatesInternal,
  useReportTemplate,
  useReportJobs as useReportJobsInternal,
  useReportHistory as useReportHistoryInternal,
  useReportStatistics as useReportStatisticsInternal,
  useCreateReportTemplate as useCreateReportTemplateInternal,
  useUpdateReportTemplate as useUpdateReportTemplateInternal,
  useDeleteReportTemplate as useDeleteReportTemplateInternal,
  useCreateReportJob as useCreateReportJobInternal,
  useUpdateReportJobStatus as useUpdateReportJobStatusInternal,
  reportQueryKeys,
  formatFileSize,
  formatJobStatus,
  type ReportTemplate,
  type ReportJob,
  type ReportHistory,
  type FieldMapping
} from './useReportManagement';

// 报表生成器 - 真实实现
import {
  useReportGenerator as useReportGeneratorInternal,
  type ReportGenerationConfig,
  type GenerationState,
  type GenerationResult
} from './useReportGenerator';

// 重新导出所有 hooks
export {
  useReportTemplatesInternal as useReportTemplates,
  useReportTemplate,
  useReportJobsInternal as useReportJobs,
  useReportHistoryInternal as useReportHistory,
  useReportStatisticsInternal as useReportStatistics,
  useCreateReportTemplateInternal as useCreateReportTemplate,
  useUpdateReportTemplateInternal as useUpdateReportTemplate,
  useDeleteReportTemplateInternal as useDeleteReportTemplate,
  useCreateReportJobInternal as useCreateReportJob,
  useUpdateReportJobStatusInternal as useUpdateReportJobStatus,
  reportQueryKeys,
  formatFileSize,
  formatJobStatus,
  type ReportTemplate,
  type ReportJob,
  type ReportHistory,
  type FieldMapping,
  useReportGeneratorInternal as useReportGenerator,
  type ReportGenerationConfig,
  type GenerationState,
  type GenerationResult
};

// 数据源管理
export {
  useDataSources,
  useTableColumns,
  getRecommendedFields,
  getDataSourceCategory,
  useDataSourcesEnhanced,
  useTableColumnsEnhanced,
  getAvailableReportDataSources,
  selectBestDataSource,
  type DatabaseObject,
  type ColumnInfo,
  type DataSourceEnhanced
} from './useDataSources';

// 向后兼容的模拟数据 hooks (逐步废弃)
export {
  useReportTemplates as useReportTemplatesMock,
  useReportJobs as useReportJobsMock,
  useReportHistory as useReportHistoryMock,
  useCreateReportTemplate as useCreateReportTemplateMock,
  useUpdateReportTemplate as useUpdateReportTemplateMock,
  useCreateReportJob as useCreateReportJobMock,
  reportQueryKeys as reportQueryKeysMock,
  formatFileSize as formatFileSizeMock,
  formatJobStatus as formatJobStatusMock,
} from './useReportManagementMock';

export {
  useReportGenerator as useReportGeneratorMock,
} from './useReportGeneratorMock';

/**
 * 便捷的组合 Hook
 * 提供统一的报表管理接口
 */
export function useReportManagement(options?: {
  templateFilters?: {
    category?: string;
    isActive?: boolean;
  };
  jobFilters?: {
    status?: string;
    limit?: number;
  };
  historyFilters?: {
    limit?: number;
  };
}) {
  
  const templates = useReportTemplatesInternal(options?.templateFilters);
  const jobs = useReportJobsInternal(options?.jobFilters);
  const history = useReportHistoryInternal(options?.historyFilters);
  const statistics = useReportStatisticsInternal();
  const generator = useReportGeneratorInternal();
  
  // Mutation hooks
  const createTemplate = useCreateReportTemplateInternal();
  const updateTemplate = useUpdateReportTemplateInternal();
  const deleteTemplate = useDeleteReportTemplateInternal();
  const createJob = useCreateReportJobInternal();
  const updateJobStatus = useUpdateReportJobStatusInternal();
  
  return {
    // 数据查询
    data: {
      templates: templates.data || [],
      jobs: jobs.data || [],
      history: history.data || [],
      statistics: statistics.data,
    },
    
    // 加载状态
    loading: {
      templates: templates.isLoading,
      jobs: jobs.isLoading,
      history: history.isLoading,
      statistics: statistics.isLoading,
      generating: generator.isGenerating,
    },
    
    // 错误状态
    errors: {
      templates: templates.error,
      jobs: jobs.error,
      history: history.error,
      statistics: statistics.error,
      generator: generator.generationState.error,
    },
    
    // 操作方法
    actions: {
      // 模板管理
      createTemplate: createTemplate.mutate,
      updateTemplate: updateTemplate.mutate,
      deleteTemplate: deleteTemplate.mutate,
      
      // 任务管理
      createJob: createJob.mutate,
      updateJobStatus: updateJobStatus.mutate,
      
      // 报表生成
      generateReport: generator.generateReport,
      cancelGeneration: generator.cancelGeneration,
      downloadReport: generator.downloadReport,
      regenerateReport: generator.regenerateReport,
    },
    
    // 生成状态
    generation: {
      state: generator.generationState,
      isGenerating: generator.isGenerating,
      progress: generator.generationState.progress,
      currentStep: generator.generationState.currentStep,
    },
    
    // 刷新方法
    refetch: {
      templates: templates.refetch,
      jobs: jobs.refetch,
      history: history.refetch,
      statistics: statistics.refetch,
    },
  };
}