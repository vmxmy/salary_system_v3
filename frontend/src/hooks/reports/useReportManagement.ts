import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// 类型定义 - 与数据库结构匹配
export interface ReportTemplate {
  id: string;
  template_name: string;
  template_key: string;
  description?: string | null;
  category: string;
  config: any; // Supabase Json type
  field_mappings: any; // Supabase Json type
  output_formats?: string[] | null;
  schedule_config?: any | null; // Supabase Json type
  is_scheduled?: boolean | null;
  is_active?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FieldMapping {
  field_key: string;
  display_name: string;
  field_type: 'string' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean';
  visible: boolean;
  sort_order: number;
  format_config?: Record<string, any>;
}

export interface ReportJob {
  id: string;
  template_id?: string | null;
  job_name: string;
  period_id?: string | null;
  data_filters?: any; // Supabase Json type
  status?: string | null;
  progress?: number | null;
  result_data?: any | null; // Supabase Json type
  error_message?: string | null;
  file_path?: string | null;
  file_size?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

export interface ReportHistory {
  id: string;
  template_id?: string | null;
  job_id?: string | null;
  report_name: string;
  period_name?: string | null;
  record_count?: number | null;
  file_path?: string | null;
  file_size?: number | null;
  file_format?: string | null;
  generated_by?: string | null;
  generated_at?: string | null;
  downloaded_count?: number | null;
  last_downloaded_at?: string | null;
}

// 查询键管理
export const reportQueryKeys = {
  all: ['reports'] as const,
  templates: (filters?: any) => [...reportQueryKeys.all, 'templates', filters] as const,
  template: (id: string) => [...reportQueryKeys.all, 'template', id] as const,
  jobs: (filters?: any) => [...reportQueryKeys.all, 'jobs', filters] as const,
  job: (id: string) => [...reportQueryKeys.all, 'job', id] as const,
  history: (filters?: any) => [...reportQueryKeys.all, 'history', filters] as const,
  statistics: () => [...reportQueryKeys.all, 'statistics'] as const,
};

// 获取报表模板列表
export const useReportTemplates = (filters?: {
  category?: string;
  isActive?: boolean;
  isScheduled?: boolean;
}) => {
  return useQuery({
    queryKey: reportQueryKeys.templates(filters),
    queryFn: async (): Promise<ReportTemplate[]> => {
      let query = supabase
        .from('report_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      
      if (filters?.isScheduled !== undefined) {
        query = query.eq('is_scheduled', filters.isScheduled);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`获取报表模板失败: ${error.message}`);
      }
      
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

// 获取单个报表模板
export const useReportTemplate = (id: string) => {
  return useQuery({
    queryKey: reportQueryKeys.template(id),
    queryFn: async (): Promise<ReportTemplate | null> => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw new Error(`获取报表模板失败: ${error.message}`);
      }
      
      return data;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10分钟
  });
};

// 获取报表任务列表
export const useReportJobs = (filters?: {
  status?: string;
  templateId?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: reportQueryKeys.jobs(filters),
    queryFn: async (): Promise<ReportJob[]> => {
      let query = supabase
        .from('report_jobs')
        .select(`
          *,
          template:report_templates(id, template_name, category)
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.templateId) {
        query = query.eq('template_id', filters.templateId);
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`获取报表任务失败: ${error.message}`);
      }
      
      return data || [];
    },
    staleTime: 30 * 1000, // 30秒
    refetchInterval: (query) => {
      // 如果有运行中的任务，每5秒刷新一次
      const data = query.state.data;
      if (!data) return false;
      const hasRunningJobs = (data as ReportJob[]).some((job: ReportJob) => job.status === 'running');
      return hasRunningJobs ? 5000 : false;
    },
  });
};

// 获取报表历史记录
export const useReportHistory = (filters?: {
  templateId?: string;
  periodName?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: reportQueryKeys.history(filters),
    queryFn: async (): Promise<ReportHistory[]> => {
      let query = supabase
        .from('report_history')
        .select(`
          *,
          template:report_templates(id, template_name, category)
        `)
        .order('generated_at', { ascending: false });
      
      if (filters?.templateId) {
        query = query.eq('template_id', filters.templateId);
      }
      
      if (filters?.periodName) {
        query = query.eq('period_name', filters.periodName);
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`获取报表历史失败: ${error.message}`);
      }
      
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2分钟
  });
};

// 获取报表统计信息
export const useReportStatistics = () => {
  return useQuery({
    queryKey: reportQueryKeys.statistics(),
    queryFn: async () => {
      const [templatesResult, jobsResult, historyResult] = await Promise.all([
        supabase.from('report_templates').select('id, is_active').eq('is_active', true),
        supabase.from('report_jobs').select('id, status, created_at'),
        supabase.from('report_history').select('id, generated_at')
      ]);

      if (templatesResult.error) {
        throw new Error(`获取模板统计失败: ${templatesResult.error.message}`);
      }
      
      if (jobsResult.error) {
        throw new Error(`获取任务统计失败: ${jobsResult.error.message}`);
      }
      
      if (historyResult.error) {
        throw new Error(`获取历史统计失败: ${historyResult.error.message}`);
      }

      const jobs = jobsResult.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayCompleted = jobs.filter((job: any) => 
        job.status === 'completed' && 
        job.created_at && 
        new Date(job.created_at) >= today
      ).length;

      return {
        templateCount: templatesResult.data?.length || 0,
        runningJobs: jobs.filter(job => job.status === 'running').length,
        completedToday: todayCompleted,
        historyCount: historyResult.data?.length || 0
      };
    },
    staleTime: 60 * 1000, // 1分钟
  });
};

// 创建报表模板
export const useCreateReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('report_templates')
        .insert([{
          template_name: template.template_name,
          template_key: template.template_key,
          description: template.description || null,
          category: template.category,
          config: template.config || {},
          field_mappings: template.field_mappings || [],
          output_formats: template.output_formats || ['xlsx', 'pdf'],
          schedule_config: template.schedule_config || {},
          is_scheduled: template.is_scheduled || false,
          is_active: template.is_active || true,
          created_by: template.created_by || null,
        }])
        .select()
        .single();
      
      if (error) {
        throw new Error(`创建报表模板失败: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.templates() });
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.statistics() });
    },
  });
};

// 更新报表模板
export const useUpdateReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<ReportTemplate> & { id: string }) => {
      const updateData: any = {};
      if (updates.template_name) updateData.template_name = updates.template_name;
      if (updates.template_key) updateData.template_key = updates.template_key;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category) updateData.category = updates.category;
      if (updates.config) updateData.config = updates.config;
      if (updates.field_mappings) updateData.field_mappings = updates.field_mappings;
      if (updates.output_formats) updateData.output_formats = updates.output_formats;
      if (updates.schedule_config !== undefined) updateData.schedule_config = updates.schedule_config;
      if (updates.is_scheduled !== undefined) updateData.is_scheduled = updates.is_scheduled;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('report_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`更新报表模板失败: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.templates() });
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.template(data.id) });
    },
  });
};

// 删除报表模板
export const useDeleteReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(`删除报表模板失败: ${error.message}`);
      }
      
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.templates() });
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.statistics() });
    },
  });
};

// 创建报表任务
export const useCreateReportJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (job: {
      template_id: string;
      job_name: string;
      period_id?: string;
      data_filters?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('report_jobs')
        .insert([{
          ...job,
          status: 'pending',
          progress: 0,
          data_filters: job.data_filters || {},
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
      
      if (error) {
        throw new Error(`创建报表任务失败: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.jobs() });
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.statistics() });
    },
  });
};

// 更新报表任务状态
export const useUpdateReportJobStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      progress,
      error_message,
      result_data,
      file_path,
      file_size
    }: {
      id: string;
      status?: string;
      progress?: number;
      error_message?: string;
      result_data?: Record<string, any>;
      file_path?: string;
      file_size?: number;
    }) => {
      const updates: Record<string, any> = {};
      
      if (status) updates.status = status;
      if (progress !== undefined) updates.progress = progress;
      if (error_message) updates.error_message = error_message;
      if (result_data) updates.result_data = result_data;
      if (file_path) updates.file_path = file_path;
      if (file_size !== undefined) updates.file_size = file_size;
      
      if (status === 'running' && !updates.started_at) {
        updates.started_at = new Date().toISOString();
      }
      
      if (status === 'completed' || status === 'failed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('report_jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw new Error(`更新任务状态失败: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.jobs() });
    },
  });
};

// 格式化文件大小
export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// 格式化报表状态
export const formatJobStatus = (status: string): { label: string; color: string } => {
  const statusMap = {
    pending: { label: '待处理', color: 'badge-warning' },
    running: { label: '执行中', color: 'badge-info' },
    completed: { label: '已完成', color: 'badge-success' },
    failed: { label: '失败', color: 'badge-error' },
  };
  
  return statusMap[status as keyof typeof statusMap] || { label: status, color: 'badge-neutral' };
};