import { supabase } from './supabaseClient';
import type { 
  Employee, 
  EmployeeWithDetails, 
  EmployeeFilters, 
  EmployeeListResponse,
  Department,
  Position,
  PersonnelCategory 
} from '../types/employee';

// 员工数据访问层
export class EmployeeAPI {
  
  /**
   * 获取员工列表（带分页和过滤）
   */
  static async getEmployees(
    page = 0,
    pageSize = 20,
    filters: EmployeeFilters = {}
  ): Promise<EmployeeListResponse> {
    try {
      let query = supabase
        .from('v_employees_with_id_numbers') // 使用安全视图
        .select('*', { count: 'exact' });

      // 应用过滤条件
      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,employee_code.ilike.%${filters.search}%`);
      }

      if (filters.department_id) {
        query = query.eq('department_id', filters.department_id);
      }

      if (filters.position_id) {
        query = query.eq('position_id', filters.position_id);
      }

      if (filters.personnel_category_id) {
        query = query.eq('personnel_category_id', filters.personnel_category_id);
      }

      if (filters.employee_status) {
        query = query.eq('employee_status', filters.employee_status);
      }

      if (filters.date_range) {
        query = query
          .gte('hire_date', filters.date_range.start)
          .lte('hire_date', filters.date_range.end);
      }

      // 分页
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data as EmployeeWithDetails[],
        total: count || 0,
        page,
        pageSize
      };

    } catch (error) {
      console.error('获取员工列表失败:', error);
      throw new Error('获取员工列表失败');
    }
  }

  /**
   * 获取单个员工详情
   */
  static async getEmployee(id: string): Promise<EmployeeWithDetails> {
    try {
      const { data, error } = await supabase
        .from('v_employees_with_id_numbers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('员工不存在');

      return data as EmployeeWithDetails;

    } catch (error) {
      console.error('获取员工详情失败:', error);
      throw new Error('获取员工详情失败');
    }
  }

  /**
   * 创建新员工
   */
  static async createEmployee(employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();

      if (error) throw error;

      return data as Employee;

    } catch (error) {
      console.error('创建员工失败:', error);
      throw new Error('创建员工失败');
    }
  }

  /**
   * 更新员工信息
   */
  static async updateEmployee(id: string, employeeData: Partial<Employee>): Promise<Employee> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update({ 
          ...employeeData, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as Employee;

    } catch (error) {
      console.error('更新员工失败:', error);
      throw new Error('更新员工失败');
    }
  }

  /**
   * 删除员工（软删除）
   */
  static async deleteEmployee(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ 
          employee_status: 'terminated',
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;

    } catch (error) {
      console.error('删除员工失败:', error);
      throw new Error('删除员工失败');
    }
  }

  /**
   * 批量删除员工
   */
  static async bulkDeleteEmployees(ids: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ 
          employee_status: 'terminated',
          updated_at: new Date().toISOString() 
        })
        .in('id', ids);

      if (error) throw error;

    } catch (error) {
      console.error('批量删除员工失败:', error);
      throw new Error('批量删除员工失败');
    }
  }

  /**
   * 获取部门列表
   */
  static async getDepartments(): Promise<Department[]> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      return data as Department[];

    } catch (error) {
      console.error('获取部门列表失败:', error);
      throw new Error('获取部门列表失败');
    }
  }

  /**
   * 获取职位列表
   */
  static async getPositions(): Promise<Position[]> {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return data as Position[];

    } catch (error) {
      console.error('获取职位列表失败:', error);
      throw new Error('获取职位列表失败');
    }
  }

  /**
   * 获取人员类别列表
   */
  static async getPersonnelCategories(): Promise<PersonnelCategory[]> {
    try {
      const { data, error } = await supabase
        .from('personnel_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return data as PersonnelCategory[];

    } catch (error) {
      console.error('获取人员类别列表失败:', error);
      throw new Error('获取人员类别列表失败');
    }
  }

  /**
   * 搜索员工（模糊匹配）
   */
  static async searchEmployees(searchTerm: string, limit = 10): Promise<EmployeeWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('v_employees_with_id_numbers')
        .select('*')
        .or(`full_name.ilike.%${searchTerm}%,employee_code.ilike.%${searchTerm}%`)
        .eq('employee_status', 'active')
        .limit(limit);

      if (error) throw error;

      return data as EmployeeWithDetails[];

    } catch (error) {
      console.error('搜索员工失败:', error);
      throw new Error('搜索员工失败');
    }
  }

  /**
   * 检查员工工号是否存在
   */
  static async checkEmployeeCodeExists(employeeCode: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('employees')
        .select('id')
        .eq('employee_code', employeeCode);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data?.length || 0) > 0;

    } catch (error) {
      console.error('检查工号失败:', error);
      return false;
    }
  }

  /**
   * 获取员工统计信息
   */
  static async getEmployeeStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    terminated: number;
    byDepartment: { department_name: string; count: number }[];
    byCategory: { category_name: string; count: number }[];
  }> {
    try {
      // 获取总体统计
      const { data: statusStats, error: statusError } = await supabase
        .from('employees')
        .select('employee_status')
        .neq('employee_status', null);

      if (statusError) throw statusError;

      // 按部门统计
      const { data: deptStats, error: deptError } = await supabase
        .from('v_employees_with_id_numbers')
        .select('department_name')
        .eq('employee_status', 'active');

      if (deptError) throw deptError;

      // 按人员类别统计
      const { data: categoryStats, error: categoryError } = await supabase
        .from('v_employees_with_id_numbers')
        .select('personnel_category_name')
        .eq('employee_status', 'active');

      if (categoryError) throw categoryError;

      // 统计处理
      const total = statusStats.length;
      const active = statusStats.filter(s => s.employee_status === 'active').length;
      const inactive = statusStats.filter(s => s.employee_status === 'inactive').length;
      const terminated = statusStats.filter(s => s.employee_status === 'terminated').length;

      const byDepartment = deptStats
        .reduce((acc: any[], curr) => {
          const existing = acc.find(item => item.department_name === curr.department_name);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ department_name: curr.department_name || '未分配', count: 1 });
          }
          return acc;
        }, [])
        .sort((a, b) => b.count - a.count);

      const byCategory = categoryStats
        .reduce((acc: any[], curr) => {
          const existing = acc.find(item => item.category_name === curr.personnel_category_name);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ category_name: curr.personnel_category_name || '未分类', count: 1 });
          }
          return acc;
        }, [])
        .sort((a, b) => b.count - a.count);

      return {
        total,
        active,
        inactive,
        terminated,
        byDepartment,
        byCategory
      };

    } catch (error) {
      console.error('获取员工统计失败:', error);
      throw new Error('获取员工统计失败');
    }
  }

  /**
   * 实时订阅员工数据变更
   */
  static subscribeToEmployees(callback: (payload: any) => void) {
    const subscription = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  /**
   * 取消订阅
   */
  static unsubscribeFromEmployees(subscription: any) {
    supabase.removeChannel(subscription);
  }
}