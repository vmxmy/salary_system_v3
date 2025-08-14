/**
 * 简化的员工服务
 * 重构后的服务层，只保留纯数据访问功能
 * 业务逻辑已移至Hook层
 */

import { supabase } from '@/lib/supabase';
import type { 
  EmployeeListItem, 
  EmployeeBasicInfo,
  CreateEmployeeRequest 
} from '@/types/employee';

/**
 * 简化的员工服务类
 * 专注于数据访问，不包含业务逻辑
 */
export class SimpleEmployeeService {
  /**
   * 获取所有员工基本信息
   */
  async getAllEmployees(): Promise<EmployeeListItem[]> {
    const { data, error } = await supabase
      .from('view_employee_basic_info')
      .select('*')
      .order('employee_name', { ascending: true });

    if (error) throw error;

    return (data || []).map(emp => ({
      id: emp.employee_id,
      employee_id: emp.employee_id,
      employee_name: emp.employee_name,
      id_number: emp.id_number,
      hire_date: emp.hire_date,
      termination_date: emp.termination_date,
      gender: emp.gender,
      date_of_birth: emp.date_of_birth,
      employment_status: emp.employment_status,
      current_status: emp.employment_status as 'active' | 'inactive' | 'terminated',
      manager_id: emp.manager_id,
      department_id: emp.department_id,
      department_name: emp.department_name,
      position_id: emp.position_id,
      position_name: emp.position_name,
      rank_id: emp.rank_id,
      rank_name: emp.rank_name,
      job_start_date: emp.job_start_date,
      category_id: emp.category_id,
      category_name: emp.category_name,
      category_start_date: emp.category_start_date,
      has_occupational_pension: emp.has_occupational_pension,
      mobile_phone: emp.mobile_phone,
      email: emp.email,
      work_email: emp.work_email,
      personal_email: emp.personal_email,
      primary_bank_account: emp.primary_bank_account,
      bank_name: emp.bank_name,
      branch_name: emp.branch_name,
      latest_institution: emp.latest_institution,
      latest_degree: emp.latest_degree,
      latest_field_of_study: emp.latest_field_of_study,
      latest_graduation_date: emp.latest_graduation_date,
      created_at: emp.created_at,
      updated_at: emp.updated_at,
    }));
  }

  /**
   * 根据ID获取员工详细信息
   */
  async getEmployeeById(employeeId: string): Promise<EmployeeBasicInfo | null> {
    const { data, error } = await supabase
      .from('view_employee_basic_info')
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // 员工不存在
      throw error;
    }

    return data;
  }

  /**
   * 创建新员工
   */
  async createEmployee(employeeData: CreateEmployeeRequest): Promise<any> {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        employee_name: employeeData.employee_name,
        id_number: employeeData.id_number,
        gender: employeeData.gender,
        date_of_birth: employeeData.date_of_birth,
        hire_date: employeeData.hire_date,
        employment_status: employeeData.employment_status || 'active',
        mobile_phone: employeeData.mobile_phone,
        email: employeeData.email,
        work_email: employeeData.work_email,
        personal_email: employeeData.personal_email,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 更新员工信息
   */
  async updateEmployee(employeeId: string, updates: Partial<CreateEmployeeRequest>): Promise<any> {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', employeeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 删除员工
   */
  async deleteEmployee(employeeId: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId);

    if (error) throw error;
  }

  /**
   * 批量删除员工
   */
  async batchDeleteEmployees(employeeIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .in('id', employeeIds);

    if (error) throw error;
  }

  /**
   * 搜索员工
   */
  async searchEmployees(searchTerm: string): Promise<EmployeeListItem[]> {
    const { data, error } = await supabase
      .from('view_employee_basic_info')
      .select('*')
      .or(`employee_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,mobile_phone.ilike.%${searchTerm}%`)
      .order('employee_name', { ascending: true });

    if (error) throw error;

    return (data || []).map(emp => ({
      // ... 同 getAllEmployees 的映射逻辑
      id: emp.employee_id,
      employee_id: emp.employee_id,
      employee_name: emp.employee_name,
      // ... 其他字段
    } as EmployeeListItem));
  }

  /**
   * 按部门获取员工
   */
  async getEmployeesByDepartment(departmentId: string): Promise<EmployeeListItem[]> {
    const { data, error } = await supabase
      .from('view_employee_basic_info')
      .select('*')
      .eq('department_id', departmentId)
      .order('employee_name', { ascending: true });

    if (error) throw error;

    return (data || []).map(emp => ({
      // ... 映射逻辑
      id: emp.employee_id,
      employee_id: emp.employee_id,
      employee_name: emp.employee_name,
      // ... 其他字段
    } as EmployeeListItem));
  }

  /**
   * 按职位获取员工
   */
  async getEmployeesByPosition(positionId: string): Promise<EmployeeListItem[]> {
    const { data, error } = await supabase
      .from('view_employee_basic_info')
      .select('*')
      .eq('position_id', positionId)
      .order('employee_name', { ascending: true });

    if (error) throw error;

    return (data || []).map(emp => ({
      // ... 映射逻辑
      id: emp.employee_id,
      employee_id: emp.employee_id,
      employee_name: emp.employee_name,
      // ... 其他字段
    } as EmployeeListItem));
  }

  /**
   * 获取员工统计信息
   */
  async getEmployeeStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    terminated: number;
    byDepartment: Record<string, number>;
    byPosition: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from('view_employee_basic_info')
      .select('employment_status, department_name, position_name');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      active: 0,
      inactive: 0,
      terminated: 0,
      byDepartment: {} as Record<string, number>,
      byPosition: {} as Record<string, number>
    };

    data?.forEach(emp => {
      // 按状态统计
      if (emp.employment_status === 'active') stats.active++;
      else if (emp.employment_status === 'inactive') stats.inactive++;
      else if (emp.employment_status === 'terminated') stats.terminated++;

      // 按部门统计
      if (emp.department_name) {
        stats.byDepartment[emp.department_name] = (stats.byDepartment[emp.department_name] || 0) + 1;
      }

      // 按职位统计
      if (emp.position_name) {
        stats.byPosition[emp.position_name] = (stats.byPosition[emp.position_name] || 0) + 1;
      }
    });

    return stats;
  }
}

/**
 * 简化的员工服务实例
 */
export const simpleEmployeeService = new SimpleEmployeeService();

/**
 * 向后兼容的默认导出
 */
export default simpleEmployeeService;