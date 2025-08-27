import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { reportQueryKeys } from './useReportManagement';

// 报表生成配置接口
export interface ReportGenerationConfig {
  templateId: string;
  format: 'xlsx' | 'pdf' | 'csv';
  periodId?: string;
  periodName?: string;
  filters?: {
    statusFilter?: string;
    searchQuery?: string;
    departmentFilter?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  outputOptions?: {
    includeHeader?: boolean;
    includeFooter?: boolean;
    pageSize?: 'A4' | 'A3' | 'Letter';
    orientation?: 'portrait' | 'landscape';
  };
}

// 生成状态接口
export interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  error?: string;
  jobId?: string;
}

// 报表生成结果
export interface GenerationResult {
  jobId: string;
  filePath?: string;
  fileSize?: number;
  recordCount?: number;
  downloadUrl?: string;
}

// 报表生成器钩子
export const useReportGenerator = () => {
  const queryClient = useQueryClient();
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    currentStep: '',
    error: undefined,
  });

  const updateProgress = useCallback((step: string, progress: number) => {
    setGenerationState(prev => ({
      ...prev,
      currentStep: step,
      progress: Math.min(100, Math.max(0, progress)),
    }));
  }, []);

  // 创建报表生成任务
  const createGenerationJob = useMutation({
    mutationFn: async (config: ReportGenerationConfig) => {
      const { data, error } = await supabase
        .from('report_jobs')
        .insert([{
          template_id: config.templateId,
          job_name: `报表生成任务 - ${new Date().toLocaleString('zh-CN')}`,
          period_id: config.periodId,
          data_filters: {
            format: config.format,
            periodName: config.periodName,
            filters: config.filters || {},
            outputOptions: config.outputOptions || {},
          },
          status: 'pending',
          progress: 0,
        }])
        .select()
        .single();
      
      if (error) {
        throw new Error(`创建报表任务失败: ${error.message}`);
      }
      
      return data;
    },
  });

  // 轮询任务状态
  const pollJobStatus = useCallback(async (jobId: string): Promise<any> => {
    const { data, error } = await supabase
      .from('report_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) {
      throw new Error(`查询任务状态失败: ${error.message}`);
    }
    
    return data;
  }, []);

  // 模拟报表生成过程（后端实现后可替换）
  const simulateGeneration = useCallback(async (config: ReportGenerationConfig): Promise<void> => {
    const steps = [
      { step: '验证模板配置...', progress: 10 },
      { step: '查询数据源...', progress: 25 },
      { step: '应用筛选条件...', progress: 40 },
      { step: '处理数据格式...', progress: 60 },
      { step: '生成报表文件...', progress: 80 },
      { step: '保存到存储...', progress: 95 },
      { step: '生成完成', progress: 100 }
    ];

    for (const { step, progress } of steps) {
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
      updateProgress(step, progress);
      
      // 模拟可能的错误
      if (Math.random() < 0.05) { // 5% 概率出错
        throw new Error('生成过程中遇到数据错误');
      }
    }
  }, [updateProgress]);

  // 主要的报表生成函数
  const generateReport = useCallback(async (config: ReportGenerationConfig): Promise<GenerationResult> => {
    setGenerationState({
      isGenerating: true,
      progress: 0,
      currentStep: '准备生成报表...',
      error: undefined,
    });

    try {
      // 1. 创建报表任务
      updateProgress('创建报表任务...', 5);
      const job = await createGenerationJob.mutateAsync(config);
      
      setGenerationState(prev => ({
        ...prev,
        jobId: job.id,
      }));

      // 2. 更新任务状态为运行中
      await supabase
        .from('report_jobs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // 3. 执行报表生成
      await simulateGeneration(config);

      // 4. 模拟生成文件信息
      const mockFileName = `report_${config.templateId}_${Date.now()}.${config.format}`;
      const mockFileSize = Math.floor(Math.random() * 1000000) + 100000; // 100KB - 1MB
      const mockRecordCount = Math.floor(Math.random() * 500) + 50;

      // 5. 更新任务为完成状态
      const { error: updateError } = await supabase
        .from('report_jobs')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          file_path: `/reports/${mockFileName}`,
          file_size: mockFileSize,
          result_data: {
            recordCount: mockRecordCount,
            generatedAt: new Date().toISOString(),
            config: JSON.stringify(config), // Convert to JSON string for storage
          }
        })
        .eq('id', job.id);

      if (updateError) {
        throw new Error(`更新任务状态失败: ${updateError.message}`);
      }

      // 6. 创建历史记录
      await supabase
        .from('report_history')
        .insert([{
          template_id: config.templateId,
          job_id: job.id,
          report_name: mockFileName,
          period_name: config.periodName || '当前周期',
          record_count: mockRecordCount,
          file_path: `/reports/${mockFileName}`,
          file_size: mockFileSize,
          file_format: config.format,
          generated_at: new Date().toISOString(),
          downloaded_count: 0,
        }]);

      // 7. 刷新相关查询缓存
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.jobs() });
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.history() });
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.statistics() });

      setGenerationState({
        isGenerating: false,
        progress: 100,
        currentStep: '生成完成',
        error: undefined,
        jobId: job.id,
      });

      return {
        jobId: job.id,
        filePath: `/reports/${mockFileName}`,
        fileSize: mockFileSize,
        recordCount: mockRecordCount,
        downloadUrl: `/api/reports/download/${mockFileName}`,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成报表失败';
      
      // 更新任务为失败状态
      if (generationState.jobId) {
        await supabase
          .from('report_jobs')
          .update({
            status: 'failed',
            progress: 0,
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
          })
          .eq('id', generationState.jobId);
        
        queryClient.invalidateQueries({ queryKey: reportQueryKeys.jobs() });
      }
      
      setGenerationState({
        isGenerating: false,
        progress: 0,
        currentStep: '',
        error: errorMessage,
      });

      throw error;
    }
  }, [createGenerationJob, updateProgress, queryClient, generationState.jobId]);

  // 取消报表生成
  const cancelGeneration = useCallback(async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('report_jobs')
        .update({
          status: 'failed',
          error_message: '用户取消',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .eq('status', 'running'); // 只能取消运行中的任务
      
      if (error) {
        throw new Error(`取消任务失败: ${error.message}`);
      }
      
      setGenerationState({
        isGenerating: false,
        progress: 0,
        currentStep: '',
        error: '任务已取消',
      });
      
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.jobs() });
      
    } catch (error) {
      console.error('取消任务失败:', error);
    }
  }, [queryClient]);

  // 下载报表文件
  const downloadReport = useCallback(async (filePath: string, fileName: string) => {
    try {
      // 首先检查文件是否为真实的存储路径
      if (filePath.startsWith('/reports/')) {
        // 模拟文件路径，生成示例文件内容
        const mockFileContent = generateMockReportContent(fileName);
        const blob = new Blob([mockFileContent], { 
          type: getMimeType(fileName) 
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // 更新下载统计
        await updateDownloadStats(filePath);
        
        return true;
      } else {
        // 对于真实文件路径，可以调用 Supabase Storage API
        throw new Error('真实文件下载功能需要配置 Supabase Storage');
      }
    } catch (error) {
      console.error('下载失败:', error);
      throw new Error(`下载文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, []);

  // 重新生成报表（基于历史记录）
  const regenerateReport = useCallback(async (historyId: string): Promise<GenerationResult> => {
    // 获取历史记录中的配置
    const { data: history, error } = await supabase
      .from('report_history')
      .select(`
        *,
        template:report_templates(*),
        job:report_jobs(data_filters)
      `)
      .eq('id', historyId)
      .single();
    
    if (error) {
      throw new Error(`获取历史记录失败: ${error.message}`);
    }
    
    if (!history.template) {
      throw new Error('关联的报表模板不存在');
    }
    
    // 重建生成配置
    const originalFilters = history.job?.data_filters || {};
    const parsedFilters = typeof originalFilters === 'string' ? JSON.parse(originalFilters) : originalFilters;
    const config: ReportGenerationConfig = {
      templateId: history.template.id,
      format: (history.file_format || 'xlsx') as 'xlsx' | 'pdf' | 'csv',
      periodName: history.period_name || '重新生成',
      filters: parsedFilters?.filters || {},
      outputOptions: parsedFilters?.outputOptions || {},
    };
    
    return generateReport(config);
  }, [generateReport]);

  return {
    // 状态
    generationState,
    isGenerating: generationState.isGenerating,
    
    // 操作
    generateReport,
    cancelGeneration,
    downloadReport,
    regenerateReport,
    updateProgress,
    
    // 工具函数
    pollJobStatus,
  };
};

// 工具函数：生成模拟报表内容
function generateMockReportContent(fileName: string): string {
  const format = fileName.split('.').pop()?.toLowerCase();
  const currentDate = new Date().toLocaleDateString('zh-CN');
  
  if (format === 'xlsx' || format === 'csv') {
    // 生成 CSV 格式的示例数据
    return `"员工姓名","部门名称","职位名称","应发工资","实发工资","薪资月份"
"张三","技术部","高级工程师","15000","12500","2025年1月"
"李四","人事部","人事专员","8000","7200","2025年1月"
"王五","财务部","财务经理","12000","10800","2025年1月"
"生成时间","${currentDate}","","","",""
"报表说明","这是一个示例报表文件","","","",""`;
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

注意: 这是系统生成的示例报表文件。`;
  }
  
  return `报表文件 - ${fileName}
生成时间: ${currentDate}
这是一个示例报表文件。`;
}

// 工具函数：获取文件 MIME 类型
function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
      return 'text/csv;charset=utf-8';
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain;charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

// 工具函数：更新下载统计
async function updateDownloadStats(filePath: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('report_history')
      .update({
        last_downloaded_at: new Date().toISOString()
      })
      .eq('file_path', filePath);
      
    if (error) {
      console.warn('更新下载统计失败:', error.message);
    }
  } catch (error) {
    console.warn('更新下载统计失败:', error);
  }
}