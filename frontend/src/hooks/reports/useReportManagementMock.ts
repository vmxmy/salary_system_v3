import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 类型定义
export interface ReportTemplate {
  id: string;
  template_name: string;
  description?: string;
  category: string;
  field_mappings: FieldMapping[];
  output_formats: string[];
  is_active: boolean;
  is_scheduled: boolean;
  schedule_config?: any;
  created_at: string;
  updated_at: string;
}

export interface FieldMapping {
  field_key: string;
  display_name: string;
  field_type: 'string' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean';
  visible: boolean;
  sort_order: number;
}

export interface ReportJob {
  id: string;
  template_id: string;
  template?: ReportTemplate;
  job_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  file_url?: string;
  file_size?: number;
  created_at: string;
  completed_at?: string;
}

export interface ReportHistory {
  id: string;
  template_id: string;
  template?: ReportTemplate;
  period_name: string;
  format: 'xlsx' | 'pdf' | 'csv';
  file_name: string;
  file_url: string;
  file_size: number;
  record_count: number;
  generation_config?: any;
  generated_at: string;
  generated_by?: string;
  generated_by_name?: string;
}

// Mock 数据
const mockTemplates: ReportTemplate[] = [
  {
    id: '1',
    template_name: '月度薪资统计报表',
    description: '包含基本薪资信息和统计数据的月度报表',
    category: 'payroll',
    field_mappings: [
      { field_key: 'employee_name', display_name: '员工姓名', field_type: 'string', visible: true, sort_order: 1 },
      { field_key: 'department_name', display_name: '部门', field_type: 'string', visible: true, sort_order: 2 },
      { field_key: 'gross_pay', display_name: '应发合计', field_type: 'currency', visible: true, sort_order: 3 },
      { field_key: 'net_pay', display_name: '实发合计', field_type: 'currency', visible: true, sort_order: 4 },
    ],
    output_formats: ['xlsx', 'csv'],
    is_active: true,
    is_scheduled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    template_name: '部门薪资汇总表',
    description: '按部门分组的薪资汇总统计',
    category: 'department',
    field_mappings: [
      { field_key: 'department_name', display_name: '部门名称', field_type: 'string', visible: true, sort_order: 1 },
      { field_key: 'employee_count', display_name: '人员数量', field_type: 'number', visible: true, sort_order: 2 },
      { field_key: 'total_gross_pay', display_name: '应发总额', field_type: 'currency', visible: true, sort_order: 3 },
      { field_key: 'average_pay', display_name: '平均薪资', field_type: 'currency', visible: true, sort_order: 4 },
    ],
    output_formats: ['xlsx', 'pdf'],
    is_active: true,
    is_scheduled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const mockJobs: ReportJob[] = [
  {
    id: '1',
    template_id: '1',
    job_name: '2025年1月薪资报表生成',
    status: 'completed',
    progress: 100,
    file_url: '/mock/reports/payroll_202501.xlsx',
    file_size: 1024000,
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1小时前
    completed_at: new Date(Date.now() - 3000000).toISOString(), // 50分钟前
  },
  {
    id: '2',
    template_id: '2',
    job_name: '部门统计报表生成',
    status: 'running',
    progress: 65,
    created_at: new Date(Date.now() - 600000).toISOString(), // 10分钟前
  }
];

const mockHistory: ReportHistory[] = [
  {
    id: '1',
    template_id: '1',
    period_name: '2025年1月',
    format: 'xlsx',
    file_name: 'payroll_202501.xlsx',
    file_url: '/mock/reports/payroll_202501.xlsx',
    file_size: 1024000,
    record_count: 150,
    generation_config: { filters: { department: 'all' } },
    generated_at: new Date(Date.now() - 86400000).toISOString(), // 1天前
    generated_by: 'user1',
    generated_by_name: '系统管理员',
  },
  {
    id: '2',
    template_id: '2',
    period_name: '2024年12月',
    format: 'pdf',
    file_name: 'department_stats_202412.pdf',
    file_url: '/mock/reports/department_stats_202412.pdf',
    file_size: 512000,
    record_count: 8,
    generation_config: { filters: { status: 'active' } },
    generated_at: new Date(Date.now() - 172800000).toISOString(), // 2天前
    generated_by: 'user2',
    generated_by_name: '人事专员',
  }
];

// 查询键管理
export const reportQueryKeys = {
  all: ['reports'] as const,
  templates: () => [...reportQueryKeys.all, 'templates'] as const,
  template: (id: string) => [...reportQueryKeys.all, 'template', id] as const,
  jobs: (filters?: any) => [...reportQueryKeys.all, 'jobs', filters] as const,
  job: (id: string) => [...reportQueryKeys.all, 'job', id] as const,
  history: (filters?: any) => [...reportQueryKeys.all, 'history', filters] as const,
};

// 获取报表模板列表
export const useReportTemplates = (filters?: {
  category?: string;
  isActive?: boolean;
}) => {
  return useQuery({
    queryKey: reportQueryKeys.templates(),
    queryFn: async () => {
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let data = [...mockTemplates];
      
      if (filters?.category) {
        data = data.filter(t => t.category === filters.category);
      }
      
      if (filters?.isActive !== undefined) {
        data = data.filter(t => t.is_active === filters.isActive);
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5分钟
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
    queryFn: async () => {
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let data = mockJobs.map(job => ({
        ...job,
        template: mockTemplates.find(t => t.id === job.template_id)
      }));
      
      if (filters?.status) {
        data = data.filter(j => j.status === filters.status);
      }
      
      if (filters?.templateId) {
        data = data.filter(j => j.template_id === filters.templateId);
      }
      
      if (filters?.limit) {
        data = data.slice(0, filters.limit);
      }
      
      return data;
    },
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 5000, // 每5秒自动刷新
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
    queryFn: async () => {
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 400));
      
      let data = mockHistory.map(history => ({
        ...history,
        template: mockTemplates.find(t => t.id === history.template_id)
      }));
      
      if (filters?.templateId) {
        data = data.filter(h => h.template_id === filters.templateId);
      }
      
      if (filters?.periodName) {
        data = data.filter(h => h.period_name === filters.periodName);
      }
      
      if (filters?.limit) {
        data = data.slice(0, filters.limit);
      }
      
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2分钟
  });
};

// 创建报表模板
export const useCreateReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newTemplate: ReportTemplate = {
        ...template,
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      mockTemplates.push(newTemplate);
      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.templates() });
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
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const index = mockTemplates.findIndex(t => t.id === id);
      if (index === -1) {
        throw new Error('Template not found');
      }
      
      mockTemplates[index] = {
        ...mockTemplates[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      return mockTemplates[index];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.templates() });
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.template(data.id) });
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
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const newJob: ReportJob = {
        ...job,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
      };
      
      mockJobs.push(newJob);
      return newJob;
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