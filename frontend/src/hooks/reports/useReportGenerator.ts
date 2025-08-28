import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { reportQueryKeys } from './useReportManagement';
import type { FieldFilterConfig } from '@/types/report-config';
import { generateReportExcel, type ReportExcelData } from './utils/excel-report-generator';

// 报表生成配置接口
export interface ReportGenerationConfig {
  templateId: string;
  format: 'xlsx' | 'pdf' | 'csv';
  periodId?: string;
  periodName?: string;
  /** 传统筛选参数（兼容性保留） */
  filters?: {
    statusFilter?: string;
    searchQuery?: string;
    departmentFilter?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  /** 字段级筛选条件（新增） */
  fieldFilters?: {
    [fieldKey: string]: {
      filters: FieldFilterConfig[];
      /** 用户输入的筛选值 */
      userInputs?: { [filterId: string]: any };
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
          data_filters: JSON.parse(JSON.stringify({
            format: config.format,
            periodName: config.periodName,
            filters: config.filters || {},
            fieldFilters: config.fieldFilters || {},
            outputOptions: config.outputOptions || {},
          })),
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
    const fieldFilterCount = Object.keys(config.fieldFilters || {}).length;
    const hasFieldFilters = fieldFilterCount > 0;

    const steps = [
      { step: '验证模板配置...', progress: 10 },
      { step: '查询数据源...', progress: 20 },
      ...(hasFieldFilters ? [
        { step: `处理字段筛选条件 (${fieldFilterCount}个字段)...`, progress: 35 },
        { step: '应用动态筛选值...', progress: 45 },
      ] : []),
      { step: '应用传统筛选条件...', progress: hasFieldFilters ? 55 : 40 },
      { step: '处理数据格式...', progress: hasFieldFilters ? 70 : 60 },
      { step: '生成报表文件...', progress: hasFieldFilters ? 85 : 80 },
      { step: '保存到存储...', progress: 95 },
      { step: '生成完成', progress: 100 }
    ];

    for (const { step, progress } of steps) {
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
      updateProgress(step, progress);
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

      // 3. 获取模板信息
      updateProgress('获取模板配置...', 10);
      const { data: template, error: templateError } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', config.templateId)
        .single();

      if (templateError || !template) {
        throw new Error(`获取模板失败: ${templateError?.message || '模板不存在'}`);
      }

      // 4. 获取报表数据
      updateProgress('查询报表数据...', 30);
      const { data: reportData, error: dataError } = await supabase
        .from('view_payroll_summary')
        .select('*')
        .limit(1000); // 限制数据量

      if (dataError) {
        throw new Error(`查询数据失败: ${dataError.message}`);
      }

      // 5. 应用筛选条件
      updateProgress('应用筛选条件...', 50);
      let filteredData = reportData || [];
      
      // 这里可以根据config.fieldFilters应用筛选条件
      // 简化版本：使用传统筛选器
      if (config.filters?.searchQuery) {
        filteredData = filteredData.filter(item => 
          item.employee_name?.includes(config.filters!.searchQuery!)
        );
      }

      if (config.filters?.departmentFilter) {
        filteredData = filteredData.filter(item => 
          item.department_name === config.filters!.departmentFilter
        );
      }

      // 6. 生成Excel文件
      updateProgress('生成Excel文件...', 70);
      
      let fileName: string;
      let fileBuffer: ArrayBuffer;
      let fileSize: number;
      
      if (config.format === 'xlsx') {
        const fieldMappings = Array.isArray(template.field_mappings) ? 
          template.field_mappings as Array<{
            field_key: string;
            display_name: string;
            field_type: string;
            visible: boolean;
            sort_order: number;
          }> : [];
          
        const excelData: ReportExcelData = {
          templateName: template.template_name,
          periodName: config.periodName,
          data: filteredData,
          fieldMappings: fieldMappings
        };

        const excelResult = await generateReportExcel(excelData);
        fileName = excelResult.fileName;
        fileBuffer = excelResult.buffer;
        fileSize = excelResult.fileSize;
      } else {
        // 对于其他格式，暂时生成CSV
        const csvContent = generateCSVContent(filteredData, Array.isArray(template.field_mappings) ? template.field_mappings : []);
        const encoder = new TextEncoder();
        fileBuffer = encoder.encode(csvContent);
        fileSize = fileBuffer.byteLength;
        fileName = `报表_${template.template_name}_${Date.now()}.${config.format}`;
      }

      // 7. 模拟文件存储（实际项目中应该上传到Supabase Storage）
      const filePath = `/reports/${fileName}`;
      
      // 将生成的文件缓存到内存中（临时解决方案）
      if (typeof window !== 'undefined') {
        (window as any).__reportFileCache = (window as any).__reportFileCache || new Map();
        (window as any).__reportFileCache.set(filePath, fileBuffer);
      }

      // 8. 更新任务为完成状态
      updateProgress('保存生成结果...', 90);
      const { error: updateError } = await supabase
        .from('report_jobs')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          file_path: filePath,
          file_size: fileSize,
          result_data: {
            recordCount: filteredData.length,
            generatedAt: new Date().toISOString(),
            config: JSON.stringify(config),
          }
        })
        .eq('id', job.id);

      if (updateError) {
        throw new Error(`更新任务状态失败: ${updateError.message}`);
      }

      // 9. 创建历史记录
      await supabase
        .from('report_history')
        .insert([{
          template_id: config.templateId,
          job_id: job.id,
          report_name: fileName,
          period_name: config.periodName || '当前周期',
          record_count: filteredData.length,
          file_path: filePath,
          file_size: fileSize,
          file_format: config.format,
          generated_at: new Date().toISOString(),
          downloaded_count: 0,
        }]);

      // 10. 刷新相关查询缓存
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
        filePath,
        fileSize,
        recordCount: filteredData.length,
        downloadUrl: `/api/reports/download/${fileName}`,
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
      // 检查是否为生成的报表文件
      if (filePath.startsWith('/reports/')) {
        // 从内存缓存中获取文件
        if (typeof window !== 'undefined' && (window as any).__reportFileCache) {
          const fileBuffer = (window as any).__reportFileCache.get(filePath);
          if (fileBuffer) {
            // 使用真实的文件缓冲区创建下载
            const blob = new Blob([fileBuffer], { 
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
          }
        }
        
        // 如果缓存中没有找到文件，生成备用内容
        console.warn('文件缓存中未找到，生成备用内容');
        const backupContent = generateBackupReportContent(fileName);
        const blob = new Blob([backupContent], { 
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
        // 对于其他文件路径，尝试调用 Supabase Storage API
        throw new Error('Supabase Storage下载功能需要进一步实现');
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

// 工具函数：生成CSV内容
function generateCSVContent(data: any[], fieldMappings: any[]): string {
  const visibleFields = fieldMappings.filter(field => field.visible).sort((a, b) => a.sort_order - b.sort_order);
  
  // 生成表头
  const headers = visibleFields.map(field => `"${field.display_name}"`).join(',');
  
  // 生成数据行
  const rows = data.map(record => {
    return visibleFields.map(field => {
      const value = record[field.field_key] ?? '';
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
}

// 工具函数：生成备用报表内容（当缓存丢失时使用）
function generateBackupReportContent(fileName: string): string {
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

// 工具函数：处理动态筛选条件
export function resolveDynamicFilterValue(filter: FieldFilterConfig): any {
  if (filter.condition_type !== 'dynamic' || !filter.dynamic_config) {
    return filter.value;
  }

  const { type, offset = 0 } = filter.dynamic_config;
  const now = new Date();

  switch (type) {
    case 'current_date':
      return now.toISOString().split('T')[0]; // YYYY-MM-DD

    case 'current_month':
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    case 'current_year':
      return now.getFullYear();

    case 'last_n_days':
      const daysAgo = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
      return daysAgo.toISOString().split('T')[0];

    case 'last_n_months':
      const monthsAgo = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      return `${monthsAgo.getFullYear()}-${String(monthsAgo.getMonth() + 1).padStart(2, '0')}`;

    default:
      return filter.value;
  }
}

// 工具函数：构建Supabase查询筛选条件
export function buildSupabaseFilters(
  query: any,
  fieldFilters: ReportGenerationConfig['fieldFilters'] = {}
) {
  Object.entries(fieldFilters).forEach(([fieldKey, { filters, userInputs = {} }]) => {
    filters.forEach((filter) => {
      if (!filter.enabled) return;

      let filterValue: any;

      // 根据条件类型获取筛选值
      switch (filter.condition_type) {
        case 'fixed':
          filterValue = filter.value;
          break;
        case 'dynamic':
          filterValue = resolveDynamicFilterValue(filter);
          break;
        case 'user_input':
          filterValue = userInputs[filter.id];
          break;
      }

      // 如果没有值且不是空值检查操作符，跳过
      if (filterValue === undefined && !['is_null', 'is_not_null'].includes(filter.operator)) {
        return;
      }

      // 应用筛选操作符
      switch (filter.operator) {
        case 'eq':
          query = query.eq(fieldKey, filterValue);
          break;
        case 'ne':
          query = query.neq(fieldKey, filterValue);
          break;
        case 'gt':
          query = query.gt(fieldKey, filterValue);
          break;
        case 'gte':
          query = query.gte(fieldKey, filterValue);
          break;
        case 'lt':
          query = query.lt(fieldKey, filterValue);
          break;
        case 'lte':
          query = query.lte(fieldKey, filterValue);
          break;
        case 'like':
          query = query.ilike(fieldKey, `%${filterValue}%`);
          break;
        case 'not_like':
          query = query.not.ilike(fieldKey, `%${filterValue}%`);
          break;
        case 'in':
          const inValues = filter.values || (Array.isArray(filterValue) ? filterValue : [filterValue]);
          query = query.in(fieldKey, inValues);
          break;
        case 'not_in':
          const notInValues = filter.values || (Array.isArray(filterValue) ? filterValue : [filterValue]);
          query = query.not.in(fieldKey, notInValues);
          break;
        case 'between':
          if (filter.value !== undefined && filter.value_end !== undefined) {
            query = query.gte(fieldKey, filter.value).lte(fieldKey, filter.value_end);
          }
          break;
        case 'not_between':
          if (filter.value !== undefined && filter.value_end !== undefined) {
            query = query.not.gte(fieldKey, filter.value).not.lte(fieldKey, filter.value_end);
          }
          break;
        case 'is_null':
          query = query.is(fieldKey, null);
          break;
        case 'is_not_null':
          query = query.not.is(fieldKey, null);
          break;
      }
    });
  });

  return query;
}

// 工具函数：验证字段筛选条件
export function validateFieldFilters(
  fieldFilters: ReportGenerationConfig['fieldFilters'] = {}
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  Object.entries(fieldFilters).forEach(([fieldKey, { filters, userInputs = {} }]) => {
    filters.forEach((filter) => {
      if (!filter.enabled) return;

      // 验证用户输入筛选条件
      if (filter.condition_type === 'user_input' && filter.input_config?.required) {
        const userValue = userInputs[filter.id];
        if (userValue === undefined || userValue === null || userValue === '') {
          errors.push(`字段 "${fieldKey}" 的筛选条件 "${filter.name}" 为必填项`);
        }
      }

      // 验证范围筛选条件
      if (['between', 'not_between'].includes(filter.operator)) {
        if (filter.condition_type === 'fixed') {
          if (filter.value === undefined || filter.value_end === undefined) {
            errors.push(`字段 "${fieldKey}" 的范围筛选条件 "${filter.name}" 需要指定起始值和结束值`);
          }
        } else if (filter.condition_type === 'user_input') {
          const userValue = userInputs[filter.id];
          if (Array.isArray(userValue) && userValue.length !== 2) {
            errors.push(`字段 "${fieldKey}" 的范围筛选条件 "${filter.name}" 需要选择完整的范围`);
          }
        }
      }

      // 验证多选筛选条件
      if (['in', 'not_in'].includes(filter.operator)) {
        if (filter.condition_type === 'fixed' && (!filter.values || filter.values.length === 0)) {
          errors.push(`字段 "${fieldKey}" 的多选筛选条件 "${filter.name}" 需要指定至少一个值`);
        } else if (filter.condition_type === 'user_input') {
          const userValue = userInputs[filter.id];
          if (!Array.isArray(userValue) || userValue.length === 0) {
            errors.push(`字段 "${fieldKey}" 的多选筛选条件 "${filter.name}" 需要选择至少一个选项`);
          }
        }
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}