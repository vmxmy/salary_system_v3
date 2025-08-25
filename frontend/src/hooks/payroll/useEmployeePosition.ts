import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import type { Database } from '@/types/supabase';

// 类型定义
type Position = Database['public']['Tables']['positions']['Row'];
type Department = Database['public']['Tables']['departments']['Row'];
type EmployeeJobHistory = Database['public']['Tables']['employee_job_history']['Row'];

// 查询键管理
export const employeePositionQueryKeys = {
  all: ['employee-positions'] as const,
  positions: () => [...employeePositionQueryKeys.all, 'list'] as const,
  employeePosition: (employeeId: string) => 
    [...employeePositionQueryKeys.all, 'employee', employeeId] as const,
  positionHistory: (employeeId: string) => 
    [...employeePositionQueryKeys.all, 'history', employeeId] as const,
  departmentPositions: (departmentId: string) => 
    [...employeePositionQueryKeys.all, 'department', departmentId] as const,
  positionSalaryRange: (positionId: string) => 
    [...employeePositionQueryKeys.all, 'salary-range', positionId] as const,
};

// 员工职务接口
export interface EmployeePosition {
  id: string;
  employee_id: string;
  position_id: string;
  position_name: string;
  position_level?: string;
  department_id: string;
  department_name: string;
  effective_date: string; // 兼容性保留
  end_date?: string | null; // 兼容性保留
  period_id?: string; // 新增周期ID
  period_name?: string; // 周期名称
  is_primary: boolean;
  is_active: boolean;
  // 职位相关的薪资标准
  salary_grade?: {
    min_salary: number;
    max_salary: number;
    standard_salary: number;
    allowances: Array<{
      type: string;
      amount: number;
      is_taxable: boolean;
    }>;
  };
}

// 职位薪资范围
interface PositionSalaryRange {
  position_id: string;
  position_name: string;
  min_salary: number;
  max_salary: number;
  avg_salary: number;
  median_salary: number;
  employee_count: number;
  standard_allowances: Array<{
    type: string;
    amount: number;
    is_mandatory: boolean;
  }>;
}

// 获取所有职位
export const useEmployeePositions = () => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: employeePositionQueryKeys.positions(),
    queryFn: async (): Promise<Position[]> => {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        handleError(error, { customMessage: '获取职位列表失败' });
        throw error;
      }
      
      return data || [];
    },
    staleTime: 30 * 60 * 1000,
  });
};

// 获取员工在指定周期的职位
export const useEmployeePositionByPeriod = (employeeId: string, periodId?: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: employeePositionQueryKeys.employeePosition(employeeId),
    queryFn: async (): Promise<EmployeePosition | null> => {
      // Step 1: Get the basic job history record
      let query = supabase
        .from('employee_job_history')
        .select(`
          id,
          employee_id,
          position_id,
          department_id,
          period_id,
          notes,
          created_at
        `)
        .eq('employee_id', employeeId);
      
      if (periodId) {
        query = query.eq('period_id', periodId);
      }
      
      query = query
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: queryData, error: jobError } = await query;
      const jobHistory = queryData?.[0] as any;

      if (jobError) {
        handleError(jobError, { customMessage: '获取员工职位失败' });
        throw jobError;
      }
      
      if (!jobHistory) return null;
      
      // Step 2: Get position details separately
      const { data: position, error: positionError } = await supabase
        .from('positions')
        .select('id, name, description')
        .eq('id', jobHistory?.position_id)
        .single();
      
      if (positionError) {
        console.warn('Failed to get position details:', positionError);
      }
      
      // Step 3: Get department details separately
      const { data: department, error: departmentError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('id', jobHistory?.department_id)
        .single();
      
      if (departmentError) {
        console.warn('Failed to get department details:', departmentError);
      }
      
      // Step 4: Get salary grade
      const salaryGrade = await getPositionSalaryGrade(jobHistory?.position_id);
      
      return {
        id: jobHistory?.id || '',
        employee_id: jobHistory?.employee_id || '',
        position_id: jobHistory?.position_id || '',
        position_name: position?.name || '',
        position_level: undefined, // v3 doesn't have level field
        department_id: jobHistory?.department_id || '',
        department_name: department?.name || '',
        effective_date: '', // 新结构中没有日期字段
        end_date: null,
        period_id: jobHistory?.period_id || '',
        is_primary: true, // 当前只支持主职位
        is_active: true,
        salary_grade: salaryGrade
      };
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};

// 兼容性方法：获取员工当前职位
export const useCurrentEmployeePosition = (employeeId: string) => {
  return useEmployeePositionByPeriod(employeeId);
};

// 获取员工职位历史
export const useEmployeePositionHistory = (employeeId: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: employeePositionQueryKeys.positionHistory(employeeId),
    queryFn: async (): Promise<EmployeePosition[]> => {
      console.log('[useEmployeePositionHistory] 开始获取员工职位历史:', { employeeId });
      
      // Step 1: Get job history records
      const { data: jobHistoryData, error } = await supabase
        .from('employee_job_history')
        .select(`
          id,
          employee_id,
          position_id,
          department_id,
          period_id,
          notes,
          created_at
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      console.log('[useEmployeePositionHistory] 获取职位历史原始数据:', {
        count: jobHistoryData?.length || 0,
        records: jobHistoryData
      });

      if (error) {
        handleError(error, { customMessage: '获取职位历史失败' });
        throw error;
      }
      
      if (!jobHistoryData || jobHistoryData.length === 0) {
        return [];
      }
      
      // Step 2: Get unique position and department IDs
      const positionIds = [...new Set(jobHistoryData.map(item => item.position_id))];
      const departmentIds = [...new Set(jobHistoryData.map(item => item.department_id))];
      const periodIds = [...new Set(jobHistoryData.map(item => item.period_id).filter(Boolean))];
      
      // Step 3: Fetch related data in parallel
      const [positionsData, departmentsData, periodsData] = await Promise.all([
        supabase
          .from('positions')
          .select('id, name, description')
          .in('id', positionIds),
        supabase
          .from('departments')
          .select('id, name')
          .in('id', departmentIds),
        periodIds.length > 0 ? supabase
          .from('payroll_periods')
          .select('id, period_name, period_year, period_month')
          .in('id', periodIds.filter(id => id !== null) as string[]) : { data: [] }
      ]);
      
      // Create lookup maps
      const positionsMap = new Map((positionsData.data || []).map(p => [p.id, p]));
      const departmentsMap = new Map((departmentsData.data || []).map(d => [d.id, d]));
      const periodsMap = new Map((periodsData.data || []).map(p => [p.id, p]));
      
      // Step 4: Process and combine data
      const history = await Promise.all(jobHistoryData.map(async (item: any) => {
        const position = positionsMap.get(item.position_id);
        const department = departmentsMap.get(item.department_id);
        const period = item.period_id ? periodsMap.get(item.period_id) : null;
        
        if (!position || !department) {
          console.warn(`Missing related data for job history ${item.id}`);
          return null;
        }
        
        const salaryGrade = await getPositionSalaryGrade(item.position_id);
        
        return {
          id: item.id,
          employee_id: item.employee_id,
          position_id: item.position_id,
          position_name: position.name,
          position_level: undefined, // v3 doesn't have level field
          department_id: item.department_id,
          department_name: department.name,
          effective_date: '', // 新结构中用period代替
          end_date: null,
          period_id: item.period_id,
          period_name: period?.period_name || '',
          is_primary: true,
          is_active: true,
          salary_grade: salaryGrade
        };
      }));
      
      return history.filter(Boolean) as EmployeePosition[];
    },
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  });
};

// 获取部门职位列表
export const useDepartmentPositions = (departmentId: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: employeePositionQueryKeys.departmentPositions(departmentId),
    queryFn: async () => {
      // Step 1: Get job history records for this department
      const { data: jobHistoryData, error } = await supabase
        .from('employee_job_history')
        .select(`
          id,
          employee_id,
          position_id,
          period_id,
          created_at
        `)
        .eq('department_id', departmentId)
        .order('created_at', { ascending: false });

      if (error) {
        handleError(error, { customMessage: '获取部门职位列表失败' });
        throw error;
      }
      
      if (!jobHistoryData || jobHistoryData.length === 0) {
        return [];
      }
      
      // Step 2: Get unique employee and position IDs
      const employeeIds = [...new Set(jobHistoryData.map(item => item.employee_id))];
      const positionIds = [...new Set(jobHistoryData.map(item => item.position_id))];
      
      // Step 3: Fetch related data in parallel
      const [employeesData, positionsData] = await Promise.all([
        supabase
          .from('employees')
          .select('id, employee_name')
          .in('id', employeeIds),
        supabase
          .from('positions')
          .select('id, name')
          .in('id', positionIds)
      ]);
      
      // Create lookup maps
      const employeesMap = new Map((employeesData.data || []).map(e => [e.id, e]));
      const positionsMap = new Map((positionsData.data || []).map(p => [p.id, p]));
      
      // Step 4: Combine data
      const result = jobHistoryData.map((item: any) => {
        const employee = employeesMap.get(item.employee_id);
        const position = positionsMap.get(item.position_id);
        
        return {
          id: item.id,
          employee_id: item.employee_id,
          position_id: item.position_id,
          period_id: item.period_id,
          created_at: item.created_at,
          employee: employee ? {
            id: employee.id,
            employee_name: employee.employee_name
          } : null,
          position: position ? {
            id: position.id,
            name: position.name
          } : null
        };
      });
      
      return result;
    },
    enabled: !!departmentId,
    staleTime: 10 * 60 * 1000,
  });
};

// 获取职位薪资标准（内部函数）
const getPositionSalaryGrade = async (positionId: string): Promise<EmployeePosition['salary_grade']> => {
  // 这里简化处理，实际应该从配置表读取
  // 可以根据职位级别设置不同的薪资范围
  // v3 数据库中 positions 表没有 level 字段，使用默认值
  const level = 'P1';
  
  // 根据级别设置薪资范围
  const salaryRanges: Record<string, EmployeePosition['salary_grade']> = {
    'P1': {
      min_salary: 5000,
      max_salary: 8000,
      standard_salary: 6500,
      allowances: [
        { type: 'meal', amount: 500, is_taxable: false },
        { type: 'transport', amount: 300, is_taxable: false }
      ]
    },
    'P2': {
      min_salary: 8000,
      max_salary: 12000,
      standard_salary: 10000,
      allowances: [
        { type: 'meal', amount: 500, is_taxable: false },
        { type: 'transport', amount: 500, is_taxable: false },
        { type: 'communication', amount: 200, is_taxable: false }
      ]
    },
    'P3': {
      min_salary: 12000,
      max_salary: 18000,
      standard_salary: 15000,
      allowances: [
        { type: 'meal', amount: 800, is_taxable: false },
        { type: 'transport', amount: 800, is_taxable: false },
        { type: 'communication', amount: 300, is_taxable: false },
        { type: 'housing', amount: 2000, is_taxable: true }
      ]
    },
    'P4': {
      min_salary: 18000,
      max_salary: 30000,
      standard_salary: 24000,
      allowances: [
        { type: 'meal', amount: 1000, is_taxable: false },
        { type: 'transport', amount: 1000, is_taxable: false },
        { type: 'communication', amount: 500, is_taxable: false },
        { type: 'housing', amount: 3000, is_taxable: true },
        { type: 'management', amount: 2000, is_taxable: true }
      ]
    }
  };
  
  return salaryRanges[level] || salaryRanges['P1'];
};

// 为员工分配职位（基于周期）
export const useAssignEmployeePosition = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      positionId: string;
      departmentId: string;
      periodId: string;
      notes?: string;
    }) => {
      const { employeeId, positionId, departmentId, periodId, notes } = params;
      
      console.log('[useAssignEmployeePosition] 开始执行职位分配:', {
        employeeId,
        positionId,
        departmentId,
        periodId,
        notes
      });
      
      // 检查该员工在该周期是否已有职位分配
      const { data: existingData, error: queryError } = await supabase
        .from('employee_job_history')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('period_id', periodId)
        .limit(1);
      
      if (queryError) {
        console.error('[useAssignEmployeePosition] 查询现有记录失败:', queryError);
        handleError(queryError, { customMessage: '查询员工职位历史失败' });
        throw queryError;
      }
      
      const existing = existingData?.[0];
      
      console.log('[useAssignEmployeePosition] 查询现有记录结果:', {
        existing,
        hasExisting: !!existing,
        operation: existing ? 'UPDATE' : 'INSERT'
      });
      
      if (existing) {
        // 更新现有记录
        console.log('[useAssignEmployeePosition] 执行更新操作，记录ID:', existing.id);
        
        const updateData = {
          position_id: positionId,
          department_id: departmentId,
          notes
        };
        
        console.log('[useAssignEmployeePosition] 更新数据:', updateData);
        
        const { data, error } = await supabase
          .from('employee_job_history')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) {
          console.error('[useAssignEmployeePosition] 更新记录失败:', {
            error,
            updateData,
            existingId: existing.id
          });
          handleError(error, { customMessage: '更新员工职位分配失败' });
          throw error;
        }
        
        console.log('[useAssignEmployeePosition] 更新成功:', data);
        return data;
      } else {
        // 创建新记录
        const { data, error } = await supabase
          .from('employee_job_history')
          .insert({
            employee_id: employeeId,
            position_id: positionId,
            department_id: departmentId,
            period_id: periodId,
            notes
          })
          .select()
          .single();

        if (error) {
          handleError(error, { customMessage: '分配员工职位失败' });
          throw error;
        }
        return data;
      }
    },
    onSuccess: (data, variables) => {
      console.log('[useAssignEmployeePosition] onSuccess 开始无效化缓存:', {
        employeeId: variables.employeeId,
        departmentId: variables.departmentId,
        result: data
      });
      
      queryClient.invalidateQueries({ 
        queryKey: employeePositionQueryKeys.employeePosition(variables.employeeId) 
      });
      console.log('[useAssignEmployeePosition] 已无效化员工职位缓存');
      
      queryClient.invalidateQueries({ 
        queryKey: employeePositionQueryKeys.positionHistory(variables.employeeId) 
      });
      console.log('[useAssignEmployeePosition] 已无效化职位历史缓存');
      
      queryClient.invalidateQueries({ 
        queryKey: employeePositionQueryKeys.departmentPositions(variables.departmentId) 
      });
      console.log('[useAssignEmployeePosition] 已无效化部门职位缓存');
      
      console.log('[useAssignEmployeePosition] 缓存无效化完成');
    },
  });
};

// 兼容性方法
export const useAssignPosition = useAssignEmployeePosition;

// 批量分配员工职位
export const useBatchAssignEmployeePositions = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      assignments: Array<{
        employeeId: string;
        positionId: string;
        departmentId: string;
        periodId: string;
        notes?: string;
      }>;
    }) => {
      const { assignments } = params;
      
      // 转换为数据库插入格式
      const insertData = assignments.map(assignment => ({
        employee_id: assignment.employeeId,
        position_id: assignment.positionId,
        department_id: assignment.departmentId,
        period_id: assignment.periodId,
        notes: assignment.notes
      }));
      
      const { data, error } = await supabase
        .from('employee_job_history')
        .upsert(insertData, {
          onConflict: 'employee_id,period_id'
        })
        .select();

      if (error) {
        handleError(error, { customMessage: '批量分配员工职位失败' });
        throw error;
      }
      
      return data || [];
    },
    onSuccess: (data, variables) => {
      // 使所有相关查询失效
      const employeeIds = [...new Set(variables.assignments.map(a => a.employeeId))];
      const departmentIds = [...new Set(variables.assignments.map(a => a.departmentId))];
      
      employeeIds.forEach(employeeId => {
        queryClient.invalidateQueries({ 
          queryKey: employeePositionQueryKeys.employeePosition(employeeId) 
        });
        queryClient.invalidateQueries({ 
          queryKey: employeePositionQueryKeys.positionHistory(employeeId) 
        });
      });
      
      departmentIds.forEach(departmentId => {
        queryClient.invalidateQueries({ 
          queryKey: employeePositionQueryKeys.departmentPositions(departmentId) 
        });
      });
    },
  });
};

// 兼容性方法
export const useTransferPosition = useBatchAssignEmployeePositions;
export const useBatchAssignPositions = useBatchAssignEmployeePositions;

// 获取职位薪资范围统计
export const usePositionSalaryRange = (positionId: string) => {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: employeePositionQueryKeys.positionSalaryRange(positionId),
    queryFn: async (): Promise<PositionSalaryRange> => {
      // 获取该职位所有员工的薪资数据（从职位历史表）
      const { data: assignments } = await supabase
        .from('employee_job_history')
        .select(`
          employee_id,
          employee:employees(
            id,
            employee_name
          )
        `)
        .eq('position_id', positionId);
      
      if (!assignments || assignments.length === 0) {
        // 返回默认值
        const salaryGrade = await getPositionSalaryGrade(positionId);
        const { data: position } = await supabase
          .from('positions')
          .select('name')
          .eq('id', positionId)
          .single();
        
        return {
          position_id: positionId,
          position_name: position?.name || '',
          min_salary: salaryGrade?.min_salary || 0,
          max_salary: salaryGrade?.max_salary || 0,
          avg_salary: salaryGrade?.standard_salary || 0,
          median_salary: salaryGrade?.standard_salary || 0,
          employee_count: 0,
          standard_allowances: salaryGrade?.allowances?.map(a => ({
            type: a.type,
            amount: a.amount,
            is_mandatory: true
          })) || []
        };
      }
      
      // 获取员工薪资数据
      const employeeIds = [...new Set(assignments.map(a => a.employee_id).filter(Boolean))];
      const { data: payrolls } = await supabase
        .from('view_payroll_summary')
        .select('employee_id, gross_pay')
        .in('employee_id', employeeIds)
        .eq('status', 'paid')
        .order('pay_date', { ascending: false });
      
      // 计算统计数据
      const salaries = payrolls?.map(p => p.gross_pay || 0) || [];
      const min = Math.min(...salaries) || 0;
      const max = Math.max(...salaries) || 0;
      const avg = salaries.length > 0 ? 
        salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;
      
      // 计算中位数
      const sorted = [...salaries].sort((a, b) => a - b);
      const median = sorted.length > 0 ?
        sorted.length % 2 === 0 ?
          (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 :
          sorted[Math.floor(sorted.length / 2)] : 0;
      
      const { data: position } = await supabase
        .from('positions')
        .select('name')
        .eq('id', positionId)
        .single();
      
      const salaryGrade = await getPositionSalaryGrade(positionId);
      
      return {
        position_id: positionId,
        position_name: position?.name || '',
        min_salary: min,
        max_salary: max,
        avg_salary: avg,
        median_salary: median,
        employee_count: employeeIds.length,
        standard_allowances: salaryGrade?.allowances?.map(a => ({
          type: a.type,
          amount: a.amount,
          is_mandatory: true
        })) || []
      };
    },
    enabled: !!positionId,
    staleTime: 30 * 60 * 1000,
  });
};

/**
 * 员工职务信息管理 Hook 配置选项
 */
interface UseEmployeePositionOptions {
  employeeId?: string;
  departmentId?: string;
  includeHistory?: boolean;
}

/**
 * 主员工职务管理 Hook
 */
export function useEmployeePosition(options: UseEmployeePositionOptions = {}) {
  const {
    employeeId,
    departmentId,
    includeHistory = false
  } = options;

  const queryClient = useQueryClient();

  // 使用各个子Hook
  const positionsQuery = useEmployeePositions();
  const currentPositionQuery = useCurrentEmployeePosition(employeeId || '');
  const positionHistoryQuery = useEmployeePositionHistory(employeeId || '');
  const departmentPositionsQuery = useDepartmentPositions(departmentId || '');
  const assignPositionMutation = useAssignPosition();
  const transferPositionMutation = useTransferPosition();

  // 设置实时订阅
  useEffect(() => {
    if (!employeeId) return;

    console.log('[EmployeePosition] Setting up realtime subscription for employee:', employeeId);

    const channel = supabase
      .channel(`employee-position-${employeeId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'employee_job_history',
          filter: `employee_id=eq.${employeeId}`
        },
        (payload) => {
          console.log('[EmployeePosition] Job history change detected:', payload.eventType);
          queryClient.invalidateQueries({ 
            queryKey: employeePositionQueryKeys.employeePosition(employeeId) 
          });
          if (includeHistory) {
            queryClient.invalidateQueries({ 
              queryKey: employeePositionQueryKeys.positionHistory(employeeId) 
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[EmployeePosition] Cleaning up realtime subscription');
      channel.unsubscribe();
    };
  }, [employeeId, includeHistory, queryClient]);

  // 刷新数据
  const refresh = async () => {
    const promises = [];
    promises.push(positionsQuery.refetch());
    if (employeeId) {
      promises.push(currentPositionQuery.refetch());
      if (includeHistory) {
        promises.push(positionHistoryQuery.refetch());
      }
    }
    if (departmentId) {
      promises.push(departmentPositionsQuery.refetch());
    }
    await Promise.all(promises);
  };

  return {
    // 数据
    positions: positionsQuery.data || [],
    employeePositions: currentPositionQuery.data ? [currentPositionQuery.data] : [],
    primaryPosition: currentPositionQuery.data,
    positionHistory: includeHistory ? positionHistoryQuery.data || [] : [],
    departmentPositions: departmentPositionsQuery.data || [],
    
    // 加载状态
    loading: {
      positions: positionsQuery.isLoading,
      currentPosition: currentPositionQuery.isLoading,
      history: positionHistoryQuery.isLoading,
      departmentPositions: departmentPositionsQuery.isLoading,
      isLoading: positionsQuery.isLoading || 
                 currentPositionQuery.isLoading || 
                 (includeHistory && positionHistoryQuery.isLoading) ||
                 departmentPositionsQuery.isLoading
    },

    // 错误状态
    errors: {
      positions: positionsQuery.error,
      currentPosition: currentPositionQuery.error,
      history: positionHistoryQuery.error,
      departmentPositions: departmentPositionsQuery.error
    },

    // Mutations
    mutations: {
      assignPosition: assignPositionMutation,
      transferPosition: transferPositionMutation
    },

    // 操作
    actions: {
      refresh,
      assignPosition: assignPositionMutation.mutate,
      transferPosition: transferPositionMutation.mutate
    },

    // 分析
    analytics: {
      getPositionSalaryRange: async (positionId: string) => {
        const { data } = await supabase
          .from('positions')
          .select('level')
          .eq('id', positionId)
          .single();
        
        const salaryGrade = await getPositionSalaryGrade(positionId);
        return salaryGrade;
      },
      getPositionHeadcount: async (positionId: string, periodId?: string) => {
        let query = supabase
          .from('employee_job_history')
          .select('*', { count: 'exact', head: true })
          .eq('position_id', positionId);
        
        if (periodId) {
          query = query.eq('period_id', periodId);
        }
        
        const { count } = await query;
        return count || 0;
      }
    },

    // 验证
    validation: {
      canAssignPosition: (employeeId: string, positionId: string) => {
        // 简单的前端验证
        return !!employeeId && !!positionId;
      },
      hasActivePositions: async (employeeId: string) => {
        const { data } = await supabase
          .from('employee_job_history')
          .select('id')
          .eq('employee_id', employeeId)
          .limit(1);
        return (data?.length || 0) > 0;
      }
    }
  };
}